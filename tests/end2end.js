/*

  Copyright (c) 2021 Cisco and/or its affiliates.

  Licensed under the Apache License, Version 2.0 (the "License"); you may not
  use this file except in compliance with the License. You may obtain a copy of
  the License at:

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,WITHOUT
  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
  License for the specific language governing permissions and limitations
  under the License.

  ----------------------------------------------------------------------------

  Whole system end-to-end test - use command 'mocha end2end'

  NOTE: This script, unlike the others in this directory, only works the
        system from the published APIs. It makes NO direct access to the
        database.
*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const Shared = require('./lib/shared.js');  // include first for dotenv
const Crud = require('./lib/crud.js');
const Seeder = require('./lib/seeder.js');
const URLs = require('./lib/urls.js');
const chakram = require('chakram');
const expect = chakram.expect;

// --- constanst

const LOCAL = process.env.TESTS_LOCAL_MODE != 'false' || false; // tests on a local environment not a full k8s deployment
const PAGE = 50; // number of records in a singel data upsert
const SKIPPED = 'skipped';  // used as a string return to track skipped test due to LOCAL mode

// --- the test cases

describe('End-to-End Tests', function() {

    this.timeout(0); // we are not interested in non-functional tests here

    // --- setup test context

    let admin = { id: 1, url: URLs.user(1), name: 'admin' };
    let coordinator = Seeder.users.find(e => e.properties.name === 'alice');
    let consumer = Seeder.users.find(e => e.properties.name === 'bob');
    let country = Seeder.entities.find(e => e.slug === 'country');
    let site = Seeder.entities.find(e => e.slug === 'heritage-site');

    // --- setup test expectations - keep these to teh first page of results based on insert order of seed data

    let posit = {
        'country': [
            { name: 'Afghanistan', policies: ['access-all-areas', 'all-countries'] },
            { name: 'Austria', policies: ['access-all-areas', 'all-countries', 'european-union'] },
            { name: 'Ireland', policies: ['access-all-areas', 'all-countries', 'european-union', 'british-isles'] },
            { name: 'United Kingdom', policies: ['access-all-areas', 'all-countries', 'british-isles'] }
        ],
        'heritage-site': [
            { name: 'Abbey of St Gall', policies: ['access-all-areas', 'all-heritage-sites'] },
            { name: 'Maritime Greenwich', policies: ['access-all-areas', 'all-heritage-sites', 'british-isles'] }
        ]
    };

    // --- helper to make the access headers

    function headers(token, policy) {
        let header = {};

        header['x-bbk-auth-token'] = token;
        if (LOCAL) Object.assign(header, Shared.policy_header(policy));
        Crud.headers(header);

        // Shared.sleep(1250);
    }

    // --- helpers to check expected server access

    function server_accessible(access, url) {
        return access ? Crud.get(url) : (LOCAL ? Promise.resolve(SKIPPED) : Crud.unauthorized(url));
    }

    function server_access(coordinator, contributor, consumer) {
        let tests = [];

        tests.push (server_accessible (coordinator, URLs.coordinator()));
        tests.push (server_accessible (coordinator, URLs.entity()));
        tests.push (server_accessible (coordinator, URLs.policy()));
        tests.push (server_accessible (coordinator, URLs.user()));
        tests.push (server_accessible (contributor, URLs.contributor()));
        tests.push (server_accessible (consumer, URLs.consumer()));
        tests.push (server_accessible (consumer, URLs.consumer_entity()));
        tests.push (server_accessible (consumer, URLs.consumer_catalog()));

        return Promise.all(tests).then (results => results.includes(SKIPPED));
    }

    // --- helpers to check expected instances for a given policy

    function expectation(list, policy, posited) {
        let instance = list.find(e => e.name === posited.name);
        posited.policies.includes(policy) ? expect(instance).to.be.an('object') : expect(instance).to.be.undefined;
    }

    function expectations(policy) {
        return Crud.add(URLs.access(consumer.uid), { role: 'consumer', context: policy }, undefined, (token, location) => {
            headers(token, policy);
            consumer.aid = parseInt(location.match(/\d+$/).shift());
        })
        .then(() => {
            let tests = [];
            let entities = [];

            for (let entity in posit) {
                let posited = posit[entity];

                // --- gather entity types

                for (let i = 0 ; i < posited.length ; i++) {
                    if (posited[i].policies.includes(policy)) {
                        entities.push ({ id: entity });
                        break;
                    }
                }

                // --- check entity instances in entity list

                tests.push (Crud.get(URLs.consumer_entity(entity), (list) => {
                    for (let i = 0 ; i < posited.length ; i++) {
                        expectation(list, policy, posited[i]);
                    }
                }));

                // --- check entity instances in catalog

                for (let i = 0 ; i < posited.length ; i++) {
                    tests.push (Crud.get(URLs.consumer_catalog({ type: entity, name: posited[i].name }), (list) => {
                        expectation(list, policy, posited[i]);
                    }));
                }
            }

            tests.push (Crud.verify_all(URLs.consumer_entity(), entities)); // check entity types
            tests.push (new Promise((resolve) => { headers(coordinator.token); resolve(); })); // back to coordinator key
            tests.push (Crud.delete(URLs.access(consumer.uid, consumer.aid))); // remove the key

            return Promise.all(tests);
        });
    }

    // --- helper to check expected properties in the context of field masks

    function masking (policy, entity, before, masks, after) {
        let act = [];
        headers(consumer.token, policy);

        return Crud.get(URLs.consumer_entity(entity), (list) => {
            for (let i = 0 ; i < list.length ; i++) {
                act.push(Crud.get(list[i].url, (item) => {
                    expect(item).to.be.an('object');
                    expect(item).to.have.property('entity');

                    for (let i = 0 ; i < before.length ; i++) {
                        let parts = before[i].split('.');
                        expect(item).to.have.property(parts[0]);
                        expect(item[parts[0]]).to.have.property(parts[1]);
                    }
                }));
            }
        })

        .then(() => Promise.all(act))

        .then(() => {
            headers(coordinator.token);

            let properties = Seeder.policies.find(p => p.slug === policy).properties;
            properties.policy.data_segment.field_masks = masks;
            return Crud.update(URLs.policy(policy), properties);
        })

        .then(() => {
            act = [];
            headers(consumer.token, policy);

            return Crud.get(URLs.consumer_entity(entity), (list) => {
                for (let i = 0 ; i < list.length ; i++) {
                    act.push(Crud.get(list[i].url, (item) => {
                        expect(item).to.be.an('object');
                        expect(item).to.have.property('entity');

                        for (let i = 0 ; i < before.length ; i++) {
                            let parts = before[i].split('.');
                            expect(item).to.have.property(parts[0]);

                            if (after.includes(before[i])) {
                                expect(item[parts[0]]).to.have.property(parts[1]);
                            } else {
                                expect(item[parts[0]]).to.not.have.property(parts[1]);
                            }
                        }
                    }));
                }
            });
        })

        .then(() => Promise.all(act))

        .then(() => {
            headers(coordinator.token);

            let properties = Seeder.policies.find(p => p.slug === policy).properties;
            properties.policy.data_segment.field_masks = [];
            return Crud.update(URLs.policy(policy), properties);
        });
    }

    // -- resets the whole system back to factory defaults via API calls

    /*
        NOTE: Outside of end2end, system reset is done via database calls.
              However, this is the only test script which uses production
              APIs only. Hence resetting is done here using API calls only.
    */

    function reset() {
        let resets = [];

        return Crud.get(URLs.entity(), entities => {
            resets.push(Crud.delete_all(entities.map(i => i.url)));
        })
        .then (() => Crud.get(URLs.policy(), policies => {
            resets.push(Crud.delete_all(policies.map(i => i.url)));
        }))
        .then (() => Crud.get(URLs.user(), users => {
            users.shift(); // dont delete the first (admin) user
            resets.push(Crud.delete_all(users.map(i => i.url)));
        }))
        .then (() => Promise.all(resets));
    }

    // --- the tests themselves

    it('tests are in production mode', function () {
        return LOCAL ? this.skip() : true;
    });

    it('enable the bootstrap key and check the server access rules are met (coor: true, cont: false, cons: false)', function () {
        headers(process.env.TESTS_BOOTSTRAP_KEY);
        return server_access(true, false, false).then (skipped => skipped ? this.skip() : true);
    });

    it('reset the whole system when in production mode', function () {
        return LOCAL ? this.skip() : reset();
    });

    it('there are no entities present', function () {
        return Crud.verify_all(URLs.entity(), []);
    });

    it('there are no policies present', function () {
        return Crud.verify_all(URLs.policy(), []);
    });

    it('there is only the admin user present', function () {
        return Crud.verify_all(URLs.user(), [admin]);
    });

    it('create the coordinator user', function () {
        return Crud.add(URLs.user(), coordinator.properties, undefined, (body, location) => {
            coordinator.uid = parseInt(location.match(/\d+$/).shift());
        });
    });

    it('generate a new key for the coordinator user', function () {
        return Crud.add(URLs.access(coordinator.uid), { role: 'coordinator' }, undefined, (token) => {
            coordinator.token = token;
        });
    });

    it('switch to new coordinator key and check the server access rules are still met (coor: true, cont: false, cons: false)', function () {
        headers(coordinator.token);
        return server_access(true, false, false).then (skipped => skipped ? this.skip() : true);
    });

    it('create the country entity', function () {
        return Crud.add(URLs.entity(country.slug), country.properties);
    });

    it('create the country entity connector', function () {
        return Crud.add(URLs.connector(country.slug, country.connectors[0].slug), country.connectors[0].properties, undefined, (details) => {
            country.connectors[0].id = details.id;
            country.connectors[0].token = details.token;
        });
    });

    it('switch to country connector key and check server access rules are met (coor: false, cont: true, cons: false)', function () {
        headers(country.connectors[0].token);
        return server_access(false, true, false).then (skipped => skipped ? this.skip() : true);
    });

    it('open a stream session on country', function () {
        return Crud.get(URLs.session_open(country.connectors[0].id, 'stream'), (session) => {
            country.connectors[0].session = session;
        });
    });

    it('upsert the country records into the session', function () {
        let act = Promise.resolve();
        let url = URLs.session_action(country.connectors[0].id, country.connectors[0].session, 'upsert');
        let all = Seeder.records(country.slug);

        for (let i = 0 ; i < all.length ; i += PAGE) {
            act = act.then(() => Crud.post(url, all.slice(i, i + PAGE)));
        };

        return act;
    });

    it('close the stream session on country', function () {
        return Crud.get(URLs.session_close(country.connectors[0].id, country.connectors[0].session, 'true'));
    });

    it('create the heritage-site entity', function () {
        headers(coordinator.token);
        return Crud.add(URLs.entity(site.slug), site.properties);
    });

    it('create the heritage-site entity connector', function () {
        return Crud.add(URLs.connector(site.slug, site.connectors[0].slug), site.connectors[0].properties, undefined, (details) => {
            site.connectors[0].id = details.id;
            site.connectors[0].token = details.token;
        });
    });

    it('switch to the connector key and then open a stream session on heritage-site', function () {
        headers(site.connectors[0].token);
        return Crud.get(URLs.session_open(site.connectors[0].id, 'stream'), (session) => {
            site.connectors[0].session = session;
        });
    });

    it('upsert the heritage-site records into the session', function () {
        let act = Promise.resolve();
        let url = URLs.session_action(site.connectors[0].id, site.connectors[0].session, 'upsert');
        let all = Seeder.records(site.slug);

        for (let i = 0 ; i < all.length ; i += PAGE) {
            act = act.then(() => Crud.post(url, all.slice(i, i + PAGE)));
        };

        return act;
    });

    it('close the stream session on heritage-site', function () {
        return Crud.get(URLs.session_close(site.connectors[0].id, site.connectors[0].session, 'true'));
    });

    it('add all the policies', function () {
        headers(coordinator.token);

        let act = [];
        let all = Seeder.policies;

        for (let i = 0; i < all.length; i++) {
            act.push (Crud.add(URLs.policy(all[i].slug), all[i].properties));
        }

        return Promise.all(act);
    });

    it('add the consumer user', function () {
        return Crud.add(URLs.user(), consumer.properties, undefined, (body, location) => {
            consumer.uid = parseInt(location.match(/\d+$/).shift());
        });
    });

    it('generate a key for the consumer user for the "access-all-areas" policy', function () {
        return Crud.add(URLs.access(consumer.uid), { role: 'consumer', context: 'access-all-areas' }, undefined, (token, location) => {
            consumer.token = token;
            consumer.aid = parseInt(location.match(/\d+$/).shift());
            consumer.policy = 'access-all-areas';
        });
    });

    it('switch to the consumer key and check the server access rules are still met (coor: false, cont: false, cons: true)', function () {
        headers(consumer.token, consumer.policy);
        return server_access(false, false, true).then (skipped => skipped ? this.skip() : true);
    });

    it('delete the consumer key', function () {
        headers(coordinator.token);
        return Crud.delete(URLs.access(consumer.uid, consumer.aid));
    });

    it('expectations met for policy "access-all-areas"', function () {
        return expectations('access-all-areas');
    });

    it('expectations met for policy "all-countries"', function () {
        return expectations('all-countries');
    });

    it('expectations met for policy "all-heritage-sites"', function () {
        return expectations('all-heritage-sites');
    });

    it('expectations met for policy "european-union"', function () {
        return expectations('european-union');
    });

    it('expectations met for policy "british-isles"', function () {
        return expectations('british-isles');
    });

    it('there are no keys presents for the consumer user', function () {
        return Crud.verify_all(URLs.access(consumer.uid), []);
    });

    it('generate a consumer key on "british-isles"', function () {
        return Crud.add(URLs.access(consumer.uid), { role: 'consumer', context: 'british-isles' }, undefined, (token, location) => {
            consumer.token = token;
            consumer.aid = parseInt(location.match(/\d+$/).shift());
            consumer.policy = 'british-isles';
        });
    });

    it('check data items are field masked correctly', function () {
        return masking(consumer.policy, country.slug,
                      ['entity.area', 'entity.currency', 'entity.capital', 'entity.languages', 'instance.independence'],
                      ['country.entity.currency', 'country.entity.languages', 'country.instance.independence'],
                      ['entity.area', 'entity.capital']);
    });

    it('delete consumer api key on "british-isles"', function () {
        return Crud.delete(URLs.access(consumer.uid, consumer.aid));
    })

    it('there are no keys presents for the consumer user', function () {
        return Crud.verify_all(URLs.access(consumer.uid), []);
    });

    it('generate a consumer key on "access-all-areas"', function () {
        return Crud.add(URLs.access(consumer.uid), { role: 'consumer', context: 'access-all-areas' }, undefined, (token, location) => {
            consumer.token = token;
            consumer.aid = parseInt(location.match(/\d+$/).shift());
        });
    });

    it('switch to the consumer key and check that the consumer api is accessible', function () {
        headers(consumer.token, 'access-all-areas');
        return Crud.get(URLs.consumer_catalog());
    });

    it('refresh consumer key on "access-all-areas"', function () {
        headers(coordinator.token);
        return Crud.update(URLs.access(consumer.uid, consumer.aid), { role: 'consumer', context: 'access-all-areas' }, (token) =>
        {
            consumer.old_token = consumer.token;
            consumer.token = token;
        });
    });

    it('check consumer api is not accessible with old key', function () {
        headers(consumer.old_token, 'access-all-areas');
        return LOCAL ? this.skip() : Crud.not_found(URLs.consumer_catalog());
    });

    it('check consumer api is accessible with the new key', function () {
        return Crud.get(URLs.consumer_catalog());
    });

    it('delete consumer api key on "access-all-areas"', function () {
        headers(coordinator.token);
        return Crud.delete(URLs.access(consumer.uid, consumer.aid));
    });

    it('check consumer api is not accessible with the now deleted key', function () {
        headers(consumer.token, 'access-all-areas');
        return LOCAL ? this.skip() : Crud.not_found(URLs.consumer_catalog());
    });

    it('generate a new consumer key on "access-all-areas"', function () {
        headers(coordinator.token);
        return Crud.add(URLs.access(consumer.uid), { role: 'consumer', context: 'access-all-areas' }, undefined, (token, location) => {
            consumer.token = token;
            consumer.aid = parseInt(location.match(/\d+$/).shift());
        });
    });

    it('check consumer api is accessible with the new key', function () {
        headers(consumer.token, 'access-all-areas');
        return Crud.get(URLs.consumer_catalog());
    });

    it('delete the "access-all-areas" policy"', function () {
        headers(coordinator.token);
        return Crud.delete(URLs.policy('access-all-areas'));
    });

    it('check consumer api is not accessible with the now deleted policy', function () {
        headers(consumer.token, 'access-all-areas');
        return Crud.unauthorized(URLs.consumer_catalog());
    });

    it('generate a consumer key on "all-countries"', function () {
        headers(coordinator.token);
        return Crud.add(URLs.access(consumer.uid), { role: 'consumer', context: 'all-countries' }, undefined, (token, location) => {
            consumer.token = token;
            consumer.aid = parseInt(location.match(/\d+$/).shift());
        });
    });

    it('check consumer api is accessible with the new key', function () {
        headers(consumer.token, 'all-countries');
        return Crud.get(URLs.consumer_catalog());
    });

    it('delete the consumer user', function () {
        headers(coordinator.token);
        return Crud.delete(URLs.user(consumer.uid));
    });

    it('check consumer api is not accessible for the now deleted user', function () {
        headers(consumer.token, 'all-countries');
        return LOCAL ? this.skip() : Crud.not_found(URLs.consumer_catalog());
    });

    it('switch to country connector key and then check can open stream session', function () {
        headers(country.connectors[0].token);
        return Crud.get(URLs.session_open(country.connectors[0].id));
    });

    it('delete the country connector', function () {
        headers(coordinator.token);
        return Crud.delete(URLs.connector(country.slug, country.connectors[0].slug));
    });

    it('check can no longer open stream session with the now deleted connector', function () {
        headers(country.connectors[0].token);
        return Crud.not_found(URLs.session_open(country.connectors[0].id));
    });

    it('switch to heritage-site connector key and then check can open stream session', function () {
        headers(site.connectors[0].token);
        return Crud.get(URLs.session_open(site.connectors[0].id));
    });

    it('delete the heritage-site entity', function () {
        headers(coordinator.token);
        return Crud.delete(URLs.entity(site.slug));
    });

    it('check can no longer open stream session on the now deleted entity', function () {
        headers(site.connectors[0].token);
        return Crud.not_found(URLs.session_open(site.connectors[0].id));
    });

    it('delete the coordinator user', function () {
        headers(coordinator.token);
        return Crud.delete(URLs.user(coordinator.uid));
    });

    it('check coordinator api is not accessible for deleted user', function () {
        return LOCAL ? this.skip() : Crud.not_found(URLs.entity());
    });

    it('switch back to the bootstrap key and delete remaining objects', function () {
        headers(process.env.TESTS_BOOTSTRAP_KEY);

        let act = [ Crud.delete(URLs.entity(country.slug)) ];

        return Crud.get(URLs.policy(), (list) => {
            for (let i = 0 ; i < list.length ; i++) {
                act.push(Crud.delete(URLs.policy(list[i].id)));
            }
        })

        .then (() => Promise.all(act));
    });
});
