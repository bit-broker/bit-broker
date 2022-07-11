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
The user access services test harness - use command 'mocha access'

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

describe('User Access Tests', function() {

    this.timeout(0); // we are not interested in non-functional tests here

    // --- before any tests are run

    before(() => {
        return Shared.before_any();
    });

    // --- after all the tests have been run

    after(() => {
        return Shared.after_all();
    });

    // --- start up tests - its part of the coordinator service

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

    // --- user access manipulation tests

    describe('user access manipulation tests', () => {

        let admin = { id: 1, url: URLs.user(1), name: process.env.BOOTSTRAP_USER_NAME, accesses: [] };
        let user1 = { name: DATA.name(), email: DATA.pluck(DATA.EMAIL.VALID), organization: DATA.name() };  // pluck to ensure different emails
        let user2 = { name: DATA.name(), email: DATA.pick(DATA.EMAIL.VALID), organization: DATA.name() };
        let policy1 = DATA.POLICY.ALLAREA;
        let policy2 = DATA.POLICY.EXAMPLE;
        let access1 = []; // filled out as we go
        let access2 = [];
        let deleted = null;
        let token = null;
        let all = URLs.user();

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('get the last user id sequence value', () => {
            return Shared.last_id('users').then(last => {
                user1.id = last + 1;
                user2.id = last + 2;
            });
        });

        it('only the admin user is present', () => {
            return Crud.verify_all(all, [admin]);
        });

        it('can add the first housing user', () => {
            return Crud.add(all, user1, URLs.user(user1.id));
        });

        it('can add the second housing user', () => {
            return Crud.add(all, user2, URLs.user(user2.id));
        });

        it('they are both present in the user list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, accesses: access1 },
                { ...user2, accesses: access2 }
            ]);
        });

        it('can add the first policy', () => {
            return Crud.add(URLs.policy(policy1.ID), policy1.DETAIL);
        });

        it('can add the second policy', () => {
            return Crud.add(URLs.policy(policy2.ID), policy2.DETAIL);
        });

        it('can ask for a consumer token for first user', () => {
            let url = URLs.access(user1.id, policy1.ID);
            return Crud.add(url, undefined, url, body => {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
                expect(body).to.not.be.eq(token);
                token = body;
                access1.push({ id: policy1.ID, url });
            });
        });

        it('it is reflected in the accesses list on user list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, accesses: access1 },
                { ...user2, accesses: access2 }
            ]);
        });

        it('it is reflected in the accesses list on user', () => {
            return Crud.verify(URLs.user(user1.id), { ...user1, accesses: access1 });
        });

        it('it is present in the user access list', () => {
            return Crud.verify_all(URLs.access(user1.id), [{ ...access1[0], policy: { id: policy1.ID, url: URLs.policy(policy1.ID) }}]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(access1[0].url, { ...access1[0], policy: { id: policy1.ID, url: URLs.policy(policy1.ID) }});
        });

        it('can update a consumer access to get a new token', () => {
            return Crud.update(access1[0].url, undefined, body =>
            {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
                expect(body).to.not.be.eq(token);
                token = body;
            });
        });

        it('cannot get access for wrong user', () => {
            return Crud.not_found(URLs.access(user2.id, policy1.ID));
        });

        it('cannot get access for wrong policy', () => {
            return Crud.not_found(URLs.access(user1.id, policy2.ID));
        });

        it('can ask for another consumer token for first user', () => {
            let url = URLs.access(user1.id, policy2.ID);
            return Crud.add(url, undefined, url, body => {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
                expect(body).to.not.be.eq(token);
                token = body;
                access1.push({ id: policy2.ID, url });
            });
        });

        it('can ask for a consumer token for second user', () => {
            let url = URLs.access(user2.id, policy1.ID);
            return Crud.add(url, undefined, url, body => {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
                expect(body).to.not.be.eq(token);
                token = body;
                access2.push({ id: policy1.ID, url });
            });
        });

        it('it is reflected in the accesses list on user list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, accesses: access1 },
                { ...user2, accesses: access2 }
            ]);
        });

        it('can delete last consumer token for first user', () => {
            deleted = access1.pop();
            return Crud.delete(deleted.url);
        });

        it('it is no longer present in the user access list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, accesses: access1 },
                { ...user2, accesses: access2 }
            ]);
        });

        it('it is no longer present on the accesses list on user', () => {
            return Crud.verify(URLs.user(user1.id), { ...user1, accesses: access1 });
        });

        it('iit is no longer present on the user access list', () => {
            return Crud.verify_all(URLs.access(user1.id), [{ ...access1[0], policy: { id: policy1.ID, url: URLs.policy(policy1.ID) }}]);
        });

        it('it is no longer present when addressed directly', () => {
            return Crud.not_found(deleted.url);
        });

        it('cannot re-delete the coordinator key on first user', () => {
            return Crud.not_found(deleted.url, undefined, chakram.delete);
        });

        it('can delete next consumer token for first user', () => {
            return Crud.delete(access1.pop().url);
        });

        it('it is no longer present in the user access list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, accesses: access1 },
                { ...user2, accesses: access2 }
            ]);
        });

        it('can delete the first policy', () => {
            return Crud.delete(URLs.policy(policy1.ID));
        });

        it('access have been cascade deleted on policy deletion', () => {
            access1 = access1.filter(p => p.id !== policy1.ID);
            access2 = access2.filter(p => p.id !== policy1.ID);
            return Crud.verify_all(all, [
                admin,
                { ...user1, accesses: access1 },
                { ...user2, accesses: access2 }
            ]);
        });

        it('there are no more accesses in user access list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, accesses: [] },
                { ...user2, accesses: [] }
            ]);
        });

        it('can delete the second policy', () => {
            return Crud.delete(URLs.policy(DATA.POLICY.EXAMPLE.ID));
        });

        it('can delete the second housing user', () => {
            return Crud.delete(URLs.user(user1.id));
        });

        it('can delete the first housing user', () => {
            return Crud.delete(URLs.user(user2.id));
        });
    });
});
