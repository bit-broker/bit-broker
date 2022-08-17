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
The coordinator search test harness - use command 'mocha search'

WARNING: Running this script will reset the entire database!
*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const HTTP = require('http-status-codes');
const DATA = require('./lib/data.js');
const Shared = require('./lib/shared.js');  // include first for dotenv
const URLs = require('./lib/urls.js');
const Crud = require('./lib/crud.js');
const chakram = require('chakram');
const expect = chakram.expect;

// --- the test cases

describe('Coordinator Search Tests', function() {

    this.timeout(0); // we are not interested in non-functional tests here

    // --- before any tests are run

    before(() => {
        return Shared.before_any();
    });

    // --- after all the tests have been run

    after(() => {
        return Shared.after_all();
    });

    // --- wrapper for searching and comparing expected with actual

    function search_for (search, query, candidates) {
        return Crud.get(`${ search }?q=${ query }`, body => {
            let re = new RegExp(`^${ query }.*$`, 'i');
            let expected = candidates.filter(i => i.match(re));

            expect(body).to.be.an('array');
            expect(body.length).to.be.eq(expected.length);

            expected.sort();
            body.sort();

            expect(body.join()).to.be.eq(expected.join());
        });
    }

    // --- start up tests

    describe('start up tests', () => {

        it('the server is up', () => {
            return Shared.up(process.env.TESTS_COORDINATOR);
        });

        it('it responds to an announce request', () => {
            return Shared.announce(process.env.TESTS_COORDINATOR, 'coordinator');
        });

        it('the database is empty', () => {
            return Shared.empty();
        });
    });

    // --- user search tests

    describe('user search tests', () => {
        let uid = null; // will be filled out during tests
        let search = URLs.search('user/organization');

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('get the last user id sequence value', () => {
            return Shared.last_id('users')
            .then(last => {
                uid = last + 1;
            });
        });

        it('can add users with organizations', () => {
            let tests = [];

            for (let i = 0 ; i < DATA.SEARCH.VALID.length ; i++) {
                tests.push(Crud.add(URLs.user(), { name: DATA.name(), email: DATA.pluck(DATA.EMAIL.VALID), organization: DATA.SEARCH.VALID[i] }));
            }

            return Promise.all(tests);
        });

        it('can perform user organization searches', () => {
            let tests = [];

            for (let i = 0 ; i < DATA.SEARCH.EXAMPLES.length ; i++) {
                tests.push(search_for(search, DATA.SEARCH.EXAMPLES[i], [ ...DATA.SEARCH.VALID, process.env.BOOTSTRAP_USER_ORG ]));
            }

            return Promise.all(tests);
        });

        it('can delete all users', () => {
            let tests = [];

            for (let i = 0 ; i < DATA.SEARCH.VALID.length ; i++) {
                tests.push(Crud.delete(URLs.user(uid + i)));
            }

            return Promise.all(tests);
        });
    });

    // --- entity search tests

    describe('entity search tests', () => {
        let entities = []; // will be filled out during tests
        let search = URLs.search('entity/tags');

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('can add entities with tags', () => {
            let tests = [];

            for (let i = 0 ; i < DATA.SEARCH.VALID.length ; i += 2) { // spreads over entities
                let slug = DATA.pluck(DATA.SLUG.VALID);
                let name = DATA.name();
                let tags = DATA.SEARCH.VALID.slice(i, i + 2);
                let description = DATA.text();

                entities.push(slug);
                tests.push(Crud.add(URLs.entity(slug), { name, description, tags }));
            }

            return Promise.all(tests);
        });

        it('can perform entity tag searches', () => {
            let tests = [];

            for (let i = 0 ; i < DATA.SEARCH.EXAMPLES.length ; i++) {
                tests.push(search_for(search, DATA.SEARCH.EXAMPLES[i], DATA.SEARCH.VALID));
            }

            return Promise.all(tests);
        });

        it('can delete all entities', () => {
            let tests = [];

            for (let i = 0 ; i < entities.length ; i++) {
               tests.push(Crud.delete(URLs.entity(entities[i])));
            }

            return Promise.all(tests);
        });
    });

    // --- policy search tests

    describe('policy search tests', () => {
        let policies = []; // will be filled out during tests
        let search = URLs.search('policy/tags');

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('can add policies with tags', () => {
            let tests = [];

            for (let i = 0 ; i < DATA.SEARCH.VALID.length ; i += 2) { // spreads over entities
                let slug = DATA.pluck(DATA.SLUG.VALID);
                let tags = DATA.SEARCH.VALID.slice(i, i + 2);

                policies.push(slug);
                tests.push(Crud.add(URLs.policy(slug), { ...DATA.POLICY.ALLAREA.DETAIL, tags }));
            }

            return Promise.all(tests);
        });

        it('can perform policy tag searches', () => {
            let tests = [];

            for (let i = 0 ; i < DATA.SEARCH.EXAMPLES.length ; i++) {
                tests.push(search_for(search, DATA.SEARCH.EXAMPLES[i], DATA.SEARCH.VALID));
            }

            return Promise.all(tests);
        });

        it('can delete all policies', () => {
            let tests = [];

            for (let i = 0 ; i < policies.length ; i++) {
               tests.push(Crud.delete(URLs.policy(policies[i])));
            }

            return Promise.all(tests);
        });
    });

    // --- search validation tests

    describe('search validation tests', () => {
        let search = URLs.search('user/organization');

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('cannot search with various invalid search strings', () => {
            let test = Promise.resolve()
            .then(() => Crud.bad_request(`${ search }`, [{ search: DATA.ERRORS.MIN }]))
            .then(() => Crud.bad_request(`${ search }?q=`, [{ search: DATA.ERRORS.MIN }]))
            .then(() => Crud.bad_request(`${ search }?q=${ DATA.text(DATA.SEARCH.LONGEST + 1) }`, [{ search: DATA.ERRORS.MAX }]));
            return test;
        });
    });
});
