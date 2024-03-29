/**
 * Copyright 2021 Cisco and its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/*
Whole system end-to-end test - use command 'mocha end2end'

NOTE: This script, unlike the others in this directory, only works the system
from the published APIs. It makes NO direct access to the database.

NOTE: The purpose of this script is to test end2end scenarios, especially in
production environments. It is not the intention to recreate all the tests
which have been, so dilligently, executed in the earlier development test
scripts. For example, here we _will_ test policy enforcement, entity instance
visiblity, field masking etc. But, we _won't_ test paging, catalog querying,
validation, etc. Some of these will be indirectly verified by the tests here
anyway.

*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const Shared = require('./lib/shared.js');  // include first for dotenv
const Crud = require('./lib/crud.js');
const Seeder = require('./lib/seeder.js');
const URLs = require('./lib/urls.js');
const util = require('util');
const chakram = require('chakram');
const expect = chakram.expect;

// --- constanst

const LOCAL = process.env.TESTS_LOCAL_MODE !== 'false' || false; // tests on a local environment not a full k8s deployment
const PAGE = 250; // number of records in a single data upsert
const SKIPPED = 'skipped';  // used as a string return to track skipped test due to LOCAL mode

// --- the test cases

describe('End-to-End Tests', function() {

    this.timeout(0); // we are not interested in non-functional tests here

    // --- setup test context

    let admin = { id: 1, url: URLs.user(1), name: process.env.BOOTSTRAP_USER_NAME, email: process.env.BOOTSTRAP_USER_EMAIL, coordinator: true };
    let coordinator = Seeder.users.find(e => e.properties.name === 'alice');
    let consumer = Seeder.users.find(e => e.properties.name === 'bob');
    let country = Seeder.entities.find(e => e.slug === 'country');
    let site = Seeder.entities.find(e => e.slug === 'heritage-site');
    let insertions = []; // insert reports - will be filled out during tests
    let staged = []; // live / stage items - will be filled out during tests

    // --- setup test expectations - keep these to the first page of results based on insert order of seed data

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

    function headers(token, policy, connectors) {
        let header = {};

        header['x-bbk-auth-token'] = token;
        if (connectors) header['x-bbk-connectors'] = connectors.join(',');
        if (LOCAL) Object.assign(header, Shared.policy_header(policy, connectors));

        Crud.headers(header);
    }

    // --- helper to store details of insertion of records

    function store_insert(report, all, context) {
        Object.keys(report).forEach(k => {
            let record = all.find(r => r.id === k);
            insertions.push({ ...context, name: record.name, ids: { internal: record.id, public: report[k] }} );
        });
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
        let url = URLs.access(consumer.uid, policy);
        return Crud.add(url, undefined, url, token => {
            headers(token, policy);
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

                tests.push (Crud.get(URLs.consumer_entity(entity), list => {
                    for (let i = 0 ; i < posited.length ; i++) {
                        expectation(list, policy, posited[i]);
                    }
                }));

                // --- check entity instances in catalog

                for (let i = 0 ; i < posited.length ; i++) {
                    tests.push (Crud.get(URLs.consumer_catalog({ type: entity, name: posited[i].name }), list => {
                        expectation(list, policy, posited[i]);
                    }));
                }
            }

            tests.push (Crud.verify_all(URLs.consumer_entity(), entities)); // check entity types

            return Promise.all(tests)
            .then(() => {
                headers(coordinator.token);
                return Crud.delete(URLs.access(consumer.uid, policy));
            })
        });
    }

    // --- helper to check expected properties in the context of field masks

    function masking (policy, entity, before, masks, after) {
        let act = [];
        headers(consumer.token, policy);

        return Crud.get(URLs.consumer_entity(entity), list => {
            for (let i = 0 ; i < list.length ; i++) {
                act.push(Crud.get(list[i].url, item => {
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

            return Crud.get(URLs.consumer_entity(entity), list => {
                for (let i = 0 ; i < list.length ; i++) {
                    act.push(Crud.get(list[i].url, item => {
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

    // --- helper to count returns from the catalog and entity api

    function count_items(candidates, count) {
        let checks = [];
        let found = { entity: 0, catalog: 0 };

        for (let i = 0 ; i < candidates.length ; i++) {
            let url_entity = URLs.consumer_entity(candidates[i].entity, candidates[i].ids.public);
            checks.push(Crud.exists(url_entity).then(exists => found.entity += exists ? 1 : 0));

            let url_catalog = URLs.consumer_catalog({ 'type': candidates[i].entity, 'name': candidates[i].name });
            checks.push(Crud.get(url_catalog, body => found.catalog += body.length));
        }

        return Promise.all(checks)

        .then(() => {
            expect(found.entity).to.be.eq(count);
            expect(found.catalog).to.be.eq(count);
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

    it('--- pre-test checks ---------------------------------------------------\n', function () { console.log(); return true; });

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

    it('--- create the coordinator --------------------------------------------\n', function () { console.log(); return true; });

    it('create the coordinator user', function () {
        return Crud.add(URLs.user(), coordinator.properties, undefined, (body, location) => {
            coordinator.uid = parseInt(location.match(/\d+$/).shift());
        });
    });

    it('generate a new key for the coordinator user', function () {
        return Crud.post(URLs.user_coordinator(coordinator.uid), undefined, token => {
            coordinator.token = token;
        });
    });

    it('switch to new coordinator key and check the server access rules are still met (coor: true, cont: false, cons: false)', function () {
        headers(coordinator.token);
        return server_access(true, false, false).then (skipped => skipped ? this.skip() : true);
    });

    it('test coordinator server errors are returned as expected', function () {
        return Crud.server_error(URLs.error_test(URLs.coordinator()), !LOCAL);
    });

    it('--- create country records --------------------------------------------\n', function () { console.log(); return true; });

    it('create the country entity', function () {
        headers(coordinator.token);
        let url = URLs.entity(country.slug);
        return Crud.add(url, country.properties, url);
    });

    it('create the country entity connector', function () {
        let url = URLs.connector(country.slug, country.connectors[0].slug);
        return Crud.add(url, country.connectors[0].properties, url, details => {
            country.connectors[0].id = details.id;
            country.connectors[0].token = details.token;
        });
    });

    it('make the country entity connector live', function () {
        return Crud.post(URLs.connector_live(country.slug, country.connectors[0].slug));
    });

    it('switch to country connector key and check server access rules are met (coor: false, cont: true, cons: false)', function () {
        headers(country.connectors[0].token);
        return server_access(false, true, false).then (skipped => skipped ? this.skip() : true);
    });

    it('test coordinator server errors are returned as expected', function () {
        return Crud.server_error(URLs.error_test(URLs.contributor()), !LOCAL);
    });

    it('open a stream session on country', function () {
        return Crud.get(URLs.session_open(country.connectors[0].id, 'stream'), session => {
            country.connectors[0].session = session;
        });
    });

    it('upsert the country records into the session', function () {
        let act = Promise.resolve();
        let url = URLs.session_action(country.connectors[0].id, country.connectors[0].session, 'upsert');
        let all = Seeder.records(country.slug);

        for (let i = 0 ; i < all.length ; i += PAGE) {
            act = act.then(() => Crud.post(url, all.slice(i, i + PAGE), report => {
                store_insert(report, all, {
                    entity: country.slug,
                    connector: { slug: country.connectors[0].slug, id: country.connectors[0].id },
                });
            }));
        }

        return act;
    });

    it('close the stream session on country', function () {
        return Crud.get(URLs.session_close(country.connectors[0].id, country.connectors[0].session, 'true'));
    });

    it('--- create heritage-site records --------------------------------------\n', function () { console.log(); return true; });

    it('create the heritage-site entity', function () {
        headers(coordinator.token);
        let url = URLs.entity(site.slug);
        return Crud.add(url, site.properties, url);
    });

    it('create the first heritage-site entity connector', function () {
        let url = URLs.connector(site.slug, site.connectors[0].slug);
        return Crud.add(url, site.connectors[0].properties, url, details => {
            site.connectors[0].id = details.id;
            site.connectors[0].token = details.token;
        });
    });

    it('make the first heritage-site entity connector live', function () {
        return Crud.post(URLs.connector_live(site.slug, site.connectors[0].slug));
    });

    it('switch to the first connector key and then open a stream session on heritage-site', function () {
        headers(site.connectors[0].token);
        return Crud.get(URLs.session_open(site.connectors[0].id, 'stream'), session => {
            site.connectors[0].session = session;
        });
    });

    it('upsert the first batch of heritage-site records into the session', function () {
        let act = Promise.resolve();
        let url = URLs.session_action(site.connectors[0].id, site.connectors[0].session, 'upsert');
        let all = Seeder.records(site.slug).filter(i => i.entity.category === 'cultural');

        for (let i = 0 ; i < all.length ; i += PAGE) {
            act = act.then(() => Crud.post(url, all.slice(i, i + PAGE), report => {
                store_insert(report, all, {
                    entity: site.slug,
                    connector: { slug: site.connectors[0].slug, id: site.connectors[0].id },
                });
            }));
        }

        return act;
    });

    it('close the stream session on heritage-site', function () {
        return Crud.get(URLs.session_close(site.connectors[0].id, site.connectors[0].session, 'true'));
    });

    it('create the second heritage-site entity connector', function () {
        headers(coordinator.token);
        let url = URLs.connector(site.slug, site.connectors[1].slug);
        return Crud.add(url, site.connectors[1].properties, url, details => {
            site.connectors[1].id = details.id;
            site.connectors[1].token = details.token;
        });
    });

    it('make the second heritage-site entity connector live', function () {
        return Crud.post(URLs.connector_live(site.slug, site.connectors[1].slug));
    });

    it('switch to the second connector key and then open a stream session on heritage-site', function () {
        headers(site.connectors[1].token);
        return Crud.get(URLs.session_open(site.connectors[1].id, 'stream'), session => {
            site.connectors[1].session = session;
        });
    });

    it('upsert the second batch of heritage-site records into the session', function () {
        let act = Promise.resolve();
        let url = URLs.session_action(site.connectors[1].id, site.connectors[1].session, 'upsert');
        let all = Seeder.records(site.slug).filter(i => i.entity.category !== 'cultural');

        for (let i = 0 ; i < all.length ; i += PAGE) {
            act = act.then(() => Crud.post(url, all.slice(i, i + PAGE), report => {
                store_insert(report, all, {
                    entity: site.slug,
                    connector: { slug: site.connectors[1].slug, id: site.connectors[1].id },
                });
            }));
        }

        return act;
    });

    it('close the stream session on heritage-site', function () {
        return Crud.get(URLs.session_close(site.connectors[1].id, site.connectors[1].session, 'true'));
    });

    it('--- create policies ---------------------------------------------------\n', function () { console.log(); return true; });

    it('add all the policies', function () {
        headers(coordinator.token);

        let act = [];
        let all = Seeder.policies;

        for (let i = 0; i < all.length; i++) {
            act.push (Crud.add(URLs.policy(all[i].slug), all[i].properties));
        }

        return Promise.all(act);
    });

    it('--- create consumer ---------------------------------------------------\n', function () { console.log(); return true; });

    it('add the consumer user', function () {
        headers(coordinator.token);
        return Crud.add(URLs.user(), consumer.properties, undefined, (body, location) => {
            consumer.uid = parseInt(location.match(/\d+$/).shift());
        });
    });

    it('generate a key for the consumer user for the "access-all-areas" policy', function () {
        let url = URLs.access(consumer.uid, 'access-all-areas');
        return Crud.add(url, undefined, url, token => {
            consumer.token = token;
            consumer.policy = 'access-all-areas';
        });
    });

    it('switch to the consumer key and check the server access rules are still met (coor: false, cont: false, cons: true)', function () {
        headers(consumer.token, consumer.policy);
        return server_access(false, false, true).then (skipped => skipped ? this.skip() : true);
    });

    it('test coordinator server errors are returned as expected', function () {
        return Crud.server_error(URLs.error_test(URLs.consumer()), !LOCAL);
    });

    it('delete the consumer key', function () {
        headers(coordinator.token);
        return Crud.delete(URLs.access(consumer.uid, consumer.policy));
    });

    it('there are no keys presents for the consumer user', function () {
        return Crud.verify_all(URLs.access(consumer.uid), []);
    });

    it('--- check per policy expectations -------------------------------------\n', function () { console.log(); return true; });

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

    it('--- check field masking -----------------------------------------------\n', function () { console.log(); return true; });

    it('generate a consumer key on "british-isles"', function () {
        let url = URLs.access(consumer.uid, 'british-isles');
        return Crud.add(url, undefined, url, token => {
            consumer.token = token;
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
        return Crud.delete(URLs.access(consumer.uid, 'british-isles'));
    })

    it('there are no keys presents for the consumer user', function () {
        return Crud.verify_all(URLs.access(consumer.uid), []);
    });

    it('--- check live / stage connectors --------------------------------------\n', function () { console.log(); return true; });

    it('prepare live / stage test records', () => {
        let connectors = [...new Set(insertions.map(i => i.connector.id))]; // unique list of connectors
        connectors.forEach(c => staged.push(insertions.find(i => i.connector.id === c))); // one record for each connector
        staged = staged.slice(0, 3); // three connectors needed for tests case

        expect(staged.length).to.be.eq(3);
    });

    it('generate a key for the consumer user for the "access-all-areas" policy', function () {
        headers(coordinator.token);
        let url = URLs.access(consumer.uid, 'access-all-areas');
        return Crud.add(url, undefined, url, token => {
            consumer.token = token;
            consumer.policy = 'access-all-areas';
        });
    });

    it('check all items are present', () => {
        headers(consumer.token, consumer.policy);
        return count_items(staged, 3);
    });

    it('make first connector not live', () => {
        headers(coordinator.token);
        return Crud.delete(URLs.connector_live(staged[0].entity, staged[0].connector.slug));
    });

    it('check only two items are present', () => {
        headers(consumer.token, consumer.policy);
        return count_items(staged, 2);
    });

    it('check all items are present via connectors header', () => {
        headers(consumer.token, consumer.policy, [ staged[0].connector.id ]);
        return count_items(staged, 3);
    });

    it('make second connector not live', () => {
        headers(coordinator.token);
        return Crud.delete(URLs.connector_live(staged[1].entity, staged[1].connector.slug));
    });

    it('check only one item is present', () => {
        headers(consumer.token, consumer.policy);
        return count_items(staged, 1);
    });

    it('check all items are present via connectors header', () => {
        headers(consumer.token, consumer.policy, [ staged[0].connector.id, staged[1].connector.id ]);
        return count_items(staged, 3);
    });

    it('make last connector not live', () => {
        headers(coordinator.token);
        return Crud.delete(URLs.connector_live(staged[2].entity, staged[2].connector.slug));
    });

    it('check no entity items are present', () => {
        headers(consumer.token, consumer.policy);
        return count_items(staged, 0);
    });

    it('check all items are present via connectors header', () => {
        headers(consumer.token, consumer.policy, [ staged[0].connector.id, staged[1].connector.id, staged[2].connector.id ]);
        return count_items(staged, 3);
    });

    it('make two connectors live again', () => {
        let actions = [];

        headers(coordinator.token);
        actions.push(Crud.post(URLs.connector_live(staged[0].entity, staged[0].connector.slug)));
        actions.push(Crud.post(URLs.connector_live(staged[2].entity, staged[2].connector.slug)));

        return Promise.all(actions);
    });

    it('check two entity items are present', () => {
        headers(consumer.token, consumer.policy);
        return count_items(staged, 2);
    });

    it('delete the consumer key', function () {
        headers(coordinator.token);
        return Crud.delete(URLs.access(consumer.uid, consumer.policy));
    });

    it('there are no keys presents for the consumer user', function () {
        return Crud.verify_all(URLs.access(consumer.uid), []);
    });

    it('--- check key refreshing ----------------------------------------------\n', function () { console.log(); return true; });

    it('generate a consumer key on "access-all-areas"', function () {
        headers(coordinator.token);
        let url = URLs.access(consumer.uid, 'access-all-areas');
        return Crud.add(url, undefined, url, token => {
            consumer.token = token;
            consumer.policy = 'access-all-areas';
        });
    });

    it('switch to the consumer key and check that the consumer api is accessible', function () {
        headers(consumer.token, consumer.policy);
        return Crud.get(URLs.consumer_catalog());
    });

    it('refresh consumer key on "access-all-areas"', function () {
        headers(coordinator.token);
        return Crud.update(URLs.access(consumer.uid, consumer.policy), undefined, token =>
        {
            consumer.old_token = consumer.token;
            consumer.token = token;
        });
    });

    it('check consumer api is not accessible with old key', function () {
        headers(consumer.old_token, consumer.policy);
        return LOCAL ? this.skip() : Crud.forbidden(URLs.consumer_catalog());
    });

    it('check consumer api is accessible with the new key', function () {
        headers(consumer.token, consumer.policy);
        return Crud.get(URLs.consumer_catalog());
    });

    it('delete consumer api key on "access-all-areas"', function () {
        headers(coordinator.token);
        return Crud.delete(URLs.access(consumer.uid, consumer.policy));
    });

    it('check consumer api is not accessible with the now deleted key', function () {
        headers(consumer.token, consumer.policy);
        return LOCAL ? this.skip() : Crud.forbidden(URLs.consumer_catalog());
    });

    it('--- check policy deletion ---------------------------------------------\n', function () { console.log(); return true; });

    it('generate a new consumer key on "access-all-areas"', function () {
        headers(coordinator.token);
        let url = URLs.access(consumer.uid, 'access-all-areas');
        return Crud.add(url, undefined, url, token => {
            consumer.token = token;
            consumer.policy = consumer.policy;
        });
    });

    it('check consumer api is accessible with the new key', function () {
        headers(consumer.token, consumer.policy);
        return Crud.get(URLs.consumer_catalog());
    });

    it('delete the "access-all-areas" policy"', function () {
        headers(coordinator.token);
        return Crud.delete(URLs.policy(consumer.policy));
    });

    it('check consumer api is not accessible with the now deleted policy', function () {
        headers(consumer.token, consumer.policy);
        return LOCAL ? this.skip() : Crud.forbidden(URLs.consumer_catalog());
    });

    it('--- check user deletion -----------------------------------------------\n', function () { console.log(); return true; });

    it('generate a consumer key on "all-countries"', function () {
        headers(coordinator.token);
        let url = URLs.access(consumer.uid, 'all-countries');
        return Crud.add(url, undefined, url, token => {
            consumer.token = token;
            consumer.policy = 'all-countries';
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
        return LOCAL ? this.skip() : Crud.forbidden(URLs.consumer_catalog());
    });

    it('--- check connector deletion ------------------------------------------\n', function () { console.log(); return true; });

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
        return LOCAL ? this.skip() : Crud.not_found(URLs.session_open(country.connectors[0].id));
    });

    it('--- check entity deletion ---------------------------------------------\n', function () { console.log(); return true; });

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
        return LOCAL ? this.skip() : Crud.not_found(URLs.session_open(site.connectors[0].id));
    });

    it('--- check coordinator deletion ----------------------------------------\n', function () { console.log(); return true; });

    it('delete the coordinator user', function () {
        headers(coordinator.token);
        return Crud.delete(URLs.user(coordinator.uid));
    });

    it('check coordinator api is not accessible for deleted user', function () {
        // TODO: Pending key revocation issue # 54 return LOCAL ? this.skip() : Crud.forbidden(URLs.entity());
    });

    it('--- finish-up tests ---------------------------------------------------\n', function () { console.log(); return true; });

    it('switch back to the bootstrap key and delete remaining objects', function () {
        headers(process.env.TESTS_BOOTSTRAP_KEY);

        let act = [ Crud.delete(URLs.entity(country.slug)) ];

        return Crud.get(URLs.policy(), list => {
            for (let i = 0 ; i < list.length ; i++) {
                act.push(Crud.delete(URLs.policy(list[i].id)));
            }
        })

        .then (() => Promise.all(act));
    });
});
