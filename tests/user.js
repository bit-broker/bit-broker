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
            return Shared.up(process.env.COORDINATOR_BASE);
        });

        it('it responds to an announce request', () => {
            return Shared.announce(process.env.COORDINATOR_BASE, process.env.COORDINATOR_NAME);
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
        let values1 = { name: DATA.name(), email: DATA.pluck(DATA.EMAIL.VALID) };  // pluck to ensure different emails
        let values2 = { name: DATA.name(), email: DATA.pluck(DATA.EMAIL.VALID) };
        let update1 = { name: DATA.name() };
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
                { id: id1, url: user1, name: values1.name, email: values1.email }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(user1, { id: id1, url: user1, name: values1.name, email: values1.email });
        });

        it('cannot add a duplicate user', () => {
            return Crud.duplicate(all, values1);
        });

        it('can update an user', () => {
            return Crud.update(user1, update1);
        });

        it('new values are present in the user list', () => {
            return Crud.verify_all(all, [
                { id: id1, url: user1, name: update1.name, email: values1.email }
            ]);
        });

        it('new values are present when addressed directly', () => {
            return Crud.verify(user1, { id: id1, url: user1, name: update1.name, email: values1.email });
        });

        it('the second user is not there to start with', () => {
            return Crud.not_found(user2);
        });

        it('can add a second user', () => {
            return Crud.add(all, values2, user2);
        });

        it('both are present in the user list', () => {
            return Crud.verify_all(all, [
                { id: id1, url: user1, name: update1.name, email: values1.email },
                { id: id2, url: user2, name: values2.name, email: values2.email }
            ]);
        });

        it('can delete the first user', () => {
            return Crud.delete(user1);
        });

        it('it is gone from the user list', () => {
            return Crud.verify_all(all, [
                { id: id2, url: user2, name: values2.name, email: values2.email }
            ]);
        });

        it('the user is gone when addressed directly', () => {
            return Crud.not_found(user1);
        });

        it('can delete the second user', () => {
            return Crud.delete(user2);
        });

        it('the user list is empty', () => {
            return Crud.verify_all(all, []);
        });
    });

    // --- user validation tests - here we test invalid entries only, on add and update

    describe('user validation tests', () => {

        let id = null; // will be filled in during the first test
        let user = null;
        let values = { email:DATA.pick(DATA.EMAIL.VALID), name: DATA.name() };
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
            .then(() => Crud.bad_request(all, [{ name: DATA.ERRORS.MIN }], { email: values.email }, chakram.post))
            .then(() => Crud.bad_request(all, [{ name: DATA.ERRORS.MIN }], { ...values, name: null }, chakram.post))
            .then(() => Crud.bad_request(all, [{ name: DATA.ERRORS.MIN }], { ...values, name: '' }, chakram.post))
            .then(() => Crud.bad_request(all, [{ name: DATA.ERRORS.MAX }], { ...values, name: DATA.name(DATA.NAME.LONGEST + 1)}, chakram.post))
            return test;
        });

        it('cannot create a user with an invalid email', () => {
            let test = Promise.resolve()
            .then(() => Crud.bad_request(all, [{ email: DATA.ERRORS.MIN }], { name: values.name }, chakram.post))
            .then(() => Crud.bad_request(all, [{ email: DATA.ERRORS.MIN }], { ...values, email: null }, chakram.post))
            .then(() => Crud.bad_request(all, [{ email: DATA.ERRORS.MIN }], { ...values, email: '' }, chakram.post))
            .then(() => Crud.bad_request(all, [{ email: DATA.ERRORS.MAX }], { ...values, email: DATA.name(DATA.EMAIL.LONGEST + 1) }, chakram.post))

            for (let i = 0; i < DATA.EMAIL.INVALID.length; i++) {
                test = test.then(() => Crud.bad_request(all, [{ email: DATA.ERRORS.CONFORM }], { email: DATA.EMAIL.INVALID[i] }, chakram.post))
            }

            return test;
        });

        it('can add a user', () => {
            return Crud.add(all, values, user);
        });

        it('cannot update a user with an invalid name', () => {
            let test = Promise.resolve()
            .then(() => Crud.bad_request(user, [{ name: DATA.ERRORS.MIN }], { email: values.email }, chakram.put))
            .then(() => Crud.bad_request(user, [{ name: DATA.ERRORS.MIN }], { ...values, name: null }, chakram.put))
            .then(() => Crud.bad_request(user, [{ name: DATA.ERRORS.MIN }], { ...values, name: '' }, chakram.put))
            .then(() => Crud.bad_request(user, [{ name: DATA.ERRORS.MAX }], { ...values, name: DATA.name(DATA.NAME.LONGEST + 1)}, chakram.put))
            return test;
        });

        it('can delete the first user', () => {
            return Crud.delete(user);
        });
    });
});