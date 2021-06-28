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

const Crud = require('./lib/crud.js');
const Seeder = require('./lib/seeder.js');
const URLs = require('./lib/urls.js');
const chakram = require('chakram');
const expect = chakram.expect;

// --- constanst

const LOCAL = process.env.TESTS_LOCAL_MODE || false; // tests on a local environment not a full k8s deployment
const PAGE = 50; // number of records in a singel data upsert

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
        let header = { authorizaion: token };
        if (LOCAL) header['x-bb-policy'] = policy;
        Crud.headers(header);
    }

    // --- helpers to check expected server access

    function server_accessible(access, url) {
        return access ? Crud.get(url) : (LOCAL ? Promise.resolve() : Crud.not_found(url));
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

        return Promise.all(tests);
    }

    // --- helpers to check expected instances for a given policy

    function expectation(list, policy, posited) {
        let instance = list.find(e => e.name === posited.name);
        posited.policies.includes(policy) ? expect(instance).to.be.an('object') : expect(instance).to.be.undefined;
    }

    function expectations(policy) {
        return Crud.add(URLs.access(consumer.uid), { role: 'consumer', context: policy }, undefined, (token) => headers(token, policy))

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

            // --- check entity types

            tests.push (Crud.verify_all(URLs.consumer_entity(), entities));

            return Promise.all(tests);
        });
    }

    // --- the tests themselves

    it('tests are in production mode', function () {
        return LOCAL ? this.skip() : true;
    });

    it('enable the bootstrap key', function () {
        headers(process.env.TESTS_BOOTSTRAP_KEY);
    });

    it('the server access rules are met (coor: true, cont: false, cons: false)', function () {
        return server_access(true, false, false);
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

    it('generate a key for the coordinator user', function () {
        return Crud.add(URLs.access(coordinator.uid), { role: 'coordinator' }, undefined, (token) => {
            coordinator.token = token;
        });
    });

    it('switch to the coordinator key', function () {
        headers(coordinator.token);
    });

    it('the server access rules are still met (coor: true, cont: false, cons: false)', function () {
        return server_access(true, false, false);
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

    it('switch to country connector key', function () {
        headers(country.connectors[0].token);
    });

    it('the server access rules are met (coor: false, cont: true, cons: false)', function () {
        return server_access(false, true, false);
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

    it('switch to the coordinator key', function () {
        headers(coordinator.token);
    });

    it('create the heritage-site entity', function () {
        return Crud.add(URLs.entity(site.slug), site.properties);
    });

    it('create the heritage-site entity connector', function () {
        return Crud.add(URLs.connector(site.slug, site.connectors[0].slug), site.connectors[0].properties, undefined, (details) => {
            site.connectors[0].id = details.id;
            site.connectors[0].token = details.token;
        });
    });

    it('switch to heritage-site connector key', function () {
        headers(site.connectors[0].token);
    });

    it('open a stream session on heritage-site', function () {
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

    it('switch to the coordinator key', function () {
        headers(coordinator.token);
    });

    it('add all the policies', function () {
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
        });
    });

    it('switch to the consumer key', function () {
        headers(consumer.token, 'access-all-areas');
    });

    it('the server access rules are still met (coor: false, cont: false, cons: true)', function () {
        return server_access(false, false, true);
    });

    it('delete the consumer key', function () {
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
});
