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
The user services test harness - use command 'mocha user'

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

describe('User Tests', function() {

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

    // --- user manipulation tests

    describe('user manipulation tests', () => {

        let id1 = null; // will be filled in during the first test
        let id2 = null;
        let user1 = null; // will be filled in during the first test
        let user2 = null;
        let admin = { id: 1, url: URLs.user(1), name: process.env.BOOTSTRAP_USER_NAME, organization: process.env.BOOTSTRAP_USER_ORG };
        let values1 = { name: DATA.name(), email: DATA.pluck(DATA.EMAIL.VALID), organization: DATA.name() };  // pluck to ensure different emails
        let values2 = { name: DATA.name(), email: DATA.pluck(DATA.EMAIL.VALID), organization: DATA.name() };
        let update1 = { name: DATA.name(), organization: DATA.name() };
        let all = URLs.user();

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('get the last user id sequence value', () => {
            return Shared.last_id('users')
            .then(last => {
                id1 = last + 1;
                id2 = last + 2;
                user1 = URLs.user(id1);
                user2 = URLs.user(id2);
            });
        });

        it('the user is not there to start with', () => {
            return Crud.not_found(user1);
        });

        it('can add a user', () => {
            return Crud.add(all, values1, user1);
        });

        it('it is present in the user list', () => {
            return Crud.verify_all(all, [
                admin,
                { id: id1, url: user1, email: values1.email, ...values1 }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(user1, { id: id1, url: user1, email: values1.email, ...values1 });
        });

        it('cannot add a duplicate user', () => {
            return Crud.duplicate(all, values1);
        });

        it('can update an user', () => {
            return Crud.update(user1, update1);
        });

        it('new values are present in the user list', () => {
            return Crud.verify_all(all, [
                admin,
                { id: id1, url: user1, email: values1.email, ...update1 }
            ]);
        });

        it('new values are present when addressed directly', () => {
            return Crud.verify(user1, { id: id1, url: user1, email: values1.email, ...update1 });
        });

        it('the second user is not there to start with', () => {
            return Crud.not_found(user2);
        });

        it('can add a second user', () => {
            return Crud.add(all, values2, user2);
        });

        it('both are present in the user list', () => {
            return Crud.verify_all(all, [
                admin,
                { id: id1, url: user1, email: values1.email, ...update1 },
                { id: id2, url: user2, email: values2.email, ...values2 }
            ]);
        });

        it('can find the first user by email', () => {
            return Crud.verify(URLs.user_email(values1.email), { id: id1, url: user1, email: values1.email, ...update1 });
        });

        it('can find the second user by email', () => {
            return Crud.verify(URLs.user_email(values2.email), { id: id2, url: user2, email: values2.email, ...values2 });
        });

        it('cannot find a third user by email', () => {
            return Crud.not_found(URLs.user_email(DATA.pluck(DATA.EMAIL.VALID)));
        });

        it('can delete the first user', () => {
            return Crud.delete(user1);
        });

        it('it is gone from the user list', () => {
            return Crud.verify_all(all, [
                admin,
                { id: id2, url: user2, email: values2.email, ...values2 }
            ]);
        });

        it('the user is gone when addressed directly', () => {
            return Crud.not_found(user1);
        });

        it('can delete the second user', () => {
            return Crud.delete(user2);
        });

        it('the user list is empty, except for the admin user', () => {
            return Crud.verify_all(all, [admin]);
        });
    });

    // --- user coordinator access tests

    describe('user coordinator access tests', () => {

        let uid = null; // will be filled in during the first test
        let url = null;
        let admin = { id: 1, url: URLs.user(1), name: process.env.BOOTSTRAP_USER_NAME, organization: process.env.BOOTSTRAP_USER_ORG, coordinator: true };
        let values = { name: DATA.name(), email: DATA.pick(DATA.EMAIL.VALID), organization: DATA.name() };
        let all = URLs.user();

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
                url = URLs.user(uid);
            });
        });

        it('the user is not there to start with', () => {
            return Crud.not_found(url);
        });

        it('can add a user', () => {
            return Crud.add(all, values, url);
        });

        it('it is present in the user list', () => {
            return Crud.verify_all(all, [
                admin,
                { id: uid, url: url, coordinator: false, ...values }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(url, { id: uid, url: url, coordinator: false, ...values });
        });

        it('can promote user to coordinator', () => {
            return Crud.post(URLs.user_coordinator(uid), undefined, body => {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
            });
        });

        it('it is reflected in the user list', () => {
            return Crud.verify_all(all, [
                admin,
                { id: uid, url: url, coordinator: true, ...values }
            ]);
        });

        it('it is reflected when addressed directly', () => {
            return Crud.verify(url, { id: uid, url: url, coordinator: true, ...values });
        });

        it('cannot re-promote user to coordinator', () => {
            return Crud.duplicate(URLs.user_coordinator(uid));
        });

        it('cannot promote an unknown user to coordinator', () => {
            return Crud.not_found(URLs.user_coordinator(uid + 1), undefined, chakram.post);
        });

        it('TODO: test getting a fresh coordinator token via a PUT');

        it('can de-promote user as coordinator', () => {
            return Crud.delete(URLs.user_coordinator(uid));
        });

        it('it is reflected in the user list', () => {
            return Crud.verify_all(all, [
                admin,
                { id: uid, url: url, coordinator: false, ...values }
            ]);
        });

        it('it is reflected when addressed directly', () => {
            return Crud.verify(url, { id: uid, url: url, coordinator: false, ...values });
        });

        it('cannot re-de-promote user to coordinator', () => {
            return Crud.duplicate(URLs.user_coordinator(uid), undefined, chakram.delete);
        });

        it('cannot de-promote an unknown user to coordinator', () => {
            return Crud.not_found(URLs.user_coordinator(uid + 1), undefined, chakram.delete);
        });

        it('can delete the user', () => {
            return Crud.delete(url);
        });

        it('the user list is empty, except for the admin user', () => {
            return Crud.verify_all(all, [admin]);
        });
    });

    // --- user addendum manipulation tests

    describe('user addendum manipulation tests', () => {

        let user = { id: null, name: DATA.name(), email: DATA.pick(DATA.EMAIL.VALID), organization: DATA.name(), addendum: { foo: DATA.text() } };
        let admin = { id: 1, url: URLs.user(1), name: process.env.BOOTSTRAP_USER_NAME };
        let url = null;
        let all = URLs.user();
        let addendums = [  // update in the order given
            {},
            { foo: 1 },
            { foo: 2 },
            { foo: 1, bar: 1 },
            { foo: 2, bar: 1 },
            { foo: 2 },
            { foo: { bar: 1 }},
            { foo: DATA.text(), bar: 1, foo1: { bar1: DATA.text() }},
            { foo: [DATA.text(), DATA.text(), DATA.text()]},
        ];

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('get the last user id sequence value', () => {
            return Shared.last_id('users')
            .then(last => {
                user.id = last + 1;
                url = URLs.user(user.id);
            });
        });

        it('the user is not there to start with', () => {
            return Crud.not_found(url);
        });

        it('can add the user with an addendum', () => {
            return Crud.add(all, user, url);
        });

        it('it is present in the user list', () => {
            let listed = { ...user };
            delete listed.addendum; // addendum not in list

            return Crud.verify_all(all, [ admin, listed ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(url, user);
        });

        it('can correctly update a user with various addendums', () => {
            let test = Promise.resolve();

            for(let i = 0 ; i < addendums.length; i++) {
                let update = { ...user, addendum: addendums[i] };
                test = test
                  .then(() => Crud.update(url, update))
                  .then(() => Crud.verify(url, update));
            }

            return test;
        });

        it('can delete the user', () => {
            return Crud.delete(url);
        });

        it('the user is gone when addressed directly', () => {
            return Crud.not_found(url);
        });

        it('the user list is empty, except for the admin user', () => {
            return Crud.verify_all(all, [ admin ]);
        });
    });

    // --- user validation tests - here we test invalid entries only, on add and update

    describe('user validation tests', () => {

        let id = null; // will be filled in during the first test
        let user = null;
        let values = { email: DATA.pick(DATA.EMAIL.VALID), name: DATA.name(), organization: DATA.name() };
        let all = URLs.user();

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('get the last user id sequence value', () => {
            return Shared.last_id('users').then(last => {
                id = last + 1;
                user = URLs.user(id);
            });
        });

        it('cannot create a user with an invalid name', () => {
            let test = Promise.resolve()
            .then(() => Crud.bad_request(all, [{ name: DATA.ERRORS.MIN }], { email: values.email, organization: values.organization }, chakram.post))
            .then(() => Crud.bad_request(all, [{ name: DATA.ERRORS.MIN }], { ...values, name: null }, chakram.post))
            .then(() => Crud.bad_request(all, [{ name: DATA.ERRORS.MIN }], { ...values, name: '' }, chakram.post))
            .then(() => Crud.bad_request(all, [{ name: DATA.ERRORS.MAX }], { ...values, name: DATA.name(DATA.NAME.LONGEST + 1)}, chakram.post))
            return test;
        });

        it('cannot create a user with an invalid organization', () => {
            let test = Promise.resolve()
            .then(() => Crud.bad_request(all, [{ organization: DATA.ERRORS.MIN }], { email: values.email, name: values.name }, chakram.post))
            .then(() => Crud.bad_request(all, [{ organization: DATA.ERRORS.MIN }], { ...values, organization: null }, chakram.post))
            .then(() => Crud.bad_request(all, [{ organization: DATA.ERRORS.MIN }], { ...values, organization: '' }, chakram.post))
            .then(() => Crud.bad_request(all, [{ organization: DATA.ERRORS.MAX }], { ...values, organization: DATA.name(DATA.NAME.LONGEST + 1)}, chakram.post))
            return test;
        });

        it('cannot create a user with an invalid email', () => {
            let test = Promise.resolve()
            .then(() => Crud.bad_request(all, [{ email: DATA.ERRORS.MIN }], { name: values.name, organization: values.organization }, chakram.post))
            .then(() => Crud.bad_request(all, [{ email: DATA.ERRORS.MIN }], { ...values, email: null }, chakram.post))
            .then(() => Crud.bad_request(all, [{ email: DATA.ERRORS.MIN }], { ...values, email: '' }, chakram.post))
            .then(() => Crud.bad_request(all, [{ email: DATA.ERRORS.MAX }], { ...values, email: DATA.name(DATA.EMAIL.LONGEST + 1) }, chakram.post))

            for (let i = 0; i < DATA.EMAIL.INVALID.length; i++) {
                test = test.then(() => Crud.bad_request(all, [{ email: DATA.ERRORS.CONFORM }], { email: DATA.EMAIL.INVALID[i] }, chakram.post))
            }

            return test;
        });

        it('cannot create a user with an invalid addendum', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(all, [{ addendum: DATA.ERRORS.TYPE }], { ...values, addendum: DATA.text() }, chakram.post))
            .then(() => Crud.bad_request(all, [{ addendum: DATA.ERRORS.TYPE }], { ...values, addendum: 1 }, chakram.post))
            .then(() => Crud.bad_request(all, [{ addendum: DATA.ERRORS.TYPE }], { ...values, addendum: [] }, chakram.post))
            .then(() => Crud.bad_request(all, [{ addendum: DATA.ERRORS.TYPE }], { ...values, addendum: [1] }, chakram.post));
        });

        it('can add a user', () => {
            return Crud.add(all, values, user);
        });

        it('cannot update a user with an invalid name', () => {
            let test = Promise.resolve()
            .then(() => Crud.bad_request(user, [{ name: DATA.ERRORS.MIN }], { email: values.email, organization: values.organization }, chakram.put))
            .then(() => Crud.bad_request(user, [{ name: DATA.ERRORS.MIN }], { ...values, name: null }, chakram.put))
            .then(() => Crud.bad_request(user, [{ name: DATA.ERRORS.MIN }], { ...values, name: '' }, chakram.put))
            .then(() => Crud.bad_request(user, [{ name: DATA.ERRORS.MAX }], { ...values, name: DATA.name(DATA.NAME.LONGEST + 1)}, chakram.put))
            return test;
        });

        it('cannot update a user with an invalid organization', () => {
            let test = Promise.resolve()
            .then(() => Crud.bad_request(user, [{ organization: DATA.ERRORS.MIN }], { email: values.email, name: values.name }, chakram.put))
            .then(() => Crud.bad_request(user, [{ organization: DATA.ERRORS.MIN }], { ...values, organization: null }, chakram.put))
            .then(() => Crud.bad_request(user, [{ organization: DATA.ERRORS.MIN }], { ...values, organization: '' }, chakram.put))
            .then(() => Crud.bad_request(user, [{ organization: DATA.ERRORS.MAX }], { ...values, organization: DATA.name(DATA.NAME.LONGEST + 1)}, chakram.put))
            return test;
        });

        it('cannot update a user with an invalid addendum', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(user, [{ addendum: DATA.ERRORS.TYPE }], { ...values, addendum: DATA.text() }, chakram.put))
            .then(() => Crud.bad_request(user, [{ addendum: DATA.ERRORS.TYPE }], { ...values, addendum: 1 }, chakram.put))
            .then(() => Crud.bad_request(user, [{ addendum: DATA.ERRORS.TYPE }], { ...values, addendum: [] }, chakram.put))
            .then(() => Crud.bad_request(user, [{ addendum: DATA.ERRORS.TYPE }], { ...values, addendum: [1] }, chakram.put));
        });

        it('cannot use a non-interger user id', () => {
            return Promise.resolve()
            .then(() => Crud.not_found(URLs.user('1.1'), undefined, chakram.get))
            .then(() => Crud.not_found(URLs.user('1.1'), undefined, chakram.put))
            .then(() => Crud.not_found(URLs.user('1.1'), undefined, chakram.delete))
            .then(() => Crud.not_found(URLs.user_coordinator('1.1'), undefined, chakram.post))
            .then(() => Crud.not_found(URLs.user_coordinator('1.1'), undefined, chakram.delete));
        });

        it('can delete the first user', () => {
            return Crud.delete(user);
        });
    });
});
