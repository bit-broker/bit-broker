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
            return Shared.up(process.env.COORDINATOR_BASE);
        });

        it('it responds to an announce request', () => {
            return Shared.announce(process.env.COORDINATOR_BASE, process.env.COORDINATOR_NAME);
        });

        it('the database is empty', () => {
            return Shared.empty();
        });
    });

    // --- user access manipulation tests

    describe('user access manipulation tests', () => {

        let uid1 = null; // will be filled in during the first test
        let uid2 = null;
        let aid1 = null;
        let aid2 = null;
        let aid3 = null;
        let token = null;
        let user1 = { name: DATA.name(), email: DATA.pluck(DATA.EMAIL.VALID) };  // pluck to ensure different emails
        let user2 = { name: DATA.name(), email: DATA.pick(DATA.EMAIL.VALID) };
        let values1 = { role: 'coordinator' };
        let values2 = { role: 'consumer', context: DATA.POLICY.ALLAREA.ID };
        let all = URLs.user();

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('get the last user id sequence value', () => {
            return Shared.last_id('users').then(last => {
                uid1 = last + 1;
                uid2 = last + 2
            });
        });

        it('get the last access id sequence value', () => {
            return Shared.last_id('access').then(last => {
                aid1 = last + 1;
                aid2 = last + 2;
                aid3 = last + 3;
            });
        });

        it('no users are present', () => {
            return Crud.verify_all(all, []);
        });

        it('can add the first housing user', () => {
            return Crud.add(all, user1, URLs.user(uid1));
        });

        it('can add the second housing user', () => {
            return Crud.add(all, user2, URLs.user(uid2));
        });

        it('they are both present in the user list', () => {
            return Crud.verify_all(all, [
                { ...user1, id: uid1, url: URLs.user(uid1) },
                { ...user2, id: uid2, url: URLs.user(uid2) }
            ]);
        });

        it('can add a policy', () => {
            return Crud.add(URLs.policy(DATA.POLICY.ALLAREA.ID), DATA.POLICY.ALLAREA.DETAIL);
        });

        it('can ask for a coordinator token for first user', () => {
            return Crud.add(URLs.access(uid1), values1, URLs.access(uid1, aid1), (body) => {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
                token = body;
            });
        });

        it('it is present in the user access list', () => {
            return Crud.verify_all(URLs.access(uid1), [
                { ...values1, id: aid1, url: URLs.access(uid1, aid1) }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(URLs.access(uid1, aid1), { ...values1, id: aid1, url: URLs.access(uid1, aid1) });
        });

        it('the date is present when addressed directly', () => {
            return Crud.get(URLs.access(uid1, aid1), (body) => {
                expect(body).to.be.an('object');
                expect(body.created).to.be.a('string');
                expect(body.created).to.match(new RegExp(DATA.DATE.REGEX));
            });
        });

        it('cannot ask for the same token twice', () => {
            return Crud.duplicate(URLs.access(uid1), values1);
        });

        it('can update to get a new token', () => {
            return Crud.update(URLs.access(uid1, aid1), values1, (body) =>
            {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
                expect(body).to.not.be.eq(token);
                token = body;
            });
        });

        it('can ask for a coordinator token for second user', () => {
            return Crud.add(URLs.access(uid2), values1, URLs.access(uid2, aid2), (body) => {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
                expect(body).to.not.be.eq(token);
                token = body;
            });
        });

        it('it is present in the user access list', () => {
            return Crud.verify_all(URLs.access(uid2), [
                { ...values1, id: aid2, url: URLs.access(uid2, aid2) }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(URLs.access(uid2, aid2), { ...values1, id: aid2, url: URLs.access(uid2, aid2) });
        });

        it('can ask for a consumer token for first user', () => {
            return Crud.add(URLs.access(uid1), values2, URLs.access(uid1, aid3), (body) => {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
                expect(body).to.not.be.eq(token);
                token = body;
            });
        });

        it('it is present in the user access list', () => {
            return Crud.verify_all(URLs.access(uid1), [
                { ...values1, id: aid1, url: URLs.access(uid1, aid1) },
                { ...values2, id: aid3, url: URLs.access(uid1, aid3) }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(URLs.access(uid1, aid3), { ...values2, id: aid3, url: URLs.access(uid1, aid3) });
        });

        it('can update one consumer access to get a new token', () => {
            return Crud.update(URLs.access(uid1, aid3), values2, (body) =>
            {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
                expect(body).to.not.be.eq(token);
                token = body;
            });
        });

        it('cannot get access for wrong user', () => {
            return Crud.not_found(URLs.access(uid1, aid2));
        });

        it('can delete the coordinator key on first user', () => {
            return Crud.delete(URLs.access(uid1, aid1));
        });

        it('it is no longer present in the user access list', () => {
            return Crud.verify_all(URLs.access(uid1), [
                { ...values2, id: aid3, url: URLs.access(uid1, aid3) }
            ]);
        });

        it('it is no longer present when addressed directly', () => {
            return Crud.not_found(URLs.access(uid1, aid1));
        });

        it('cannot re-delete the coordinator key on first user', () => {
            return Crud.not_found(URLs.access(uid1, aid1), undefined, chakram.delete);
        });

        it('can delete the consumer key on first user', () => {
            return Crud.delete(URLs.access(uid1, aid3));
        });

        it('it is no longer present in the user access list', () => {
            return Crud.verify_all(URLs.access(uid1), []);
        });

        it('it is no longer present when addressed directly', () => {
            return Crud.not_found(URLs.access(uid1, aid3));
        });

        it('can delete the policy', () => {
            return Crud.delete(URLs.policy(DATA.POLICY.ALLAREA.ID));
        });

        it('can delete the second housing user', () => {
            return Crud.delete(URLs.user(uid1));
        });

        it('can delete the first housing user', () => {
            return Crud.delete(URLs.user(uid2));
        });
    });

    // --- user access validation tests

    describe('user access validation tests', () => {

        let uid = null; // will be filled in during the first test
        let aid = null;
        let access = null;
        let user = { name: DATA.name(), email: DATA.pluck(DATA.EMAIL.VALID) };  // pluck to ensure different emails
        let coordinator = { role: 'coordinator' };
        let consumer = { role: 'consumer' };
        let all = URLs.user();

        function get_key(values) { // gets a key
            return Crud.add(access, values, URLs.access(uid, ++aid), (body) => {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
            });
        }

        function get_del_key(values) { // gets and then deletes a key
            return get_key(values)
            .then (() => Crud.delete(URLs.access(uid, aid)));
        }

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('get the last user id sequence value', () => {
            return Shared.last_id('users').then(last => {
                uid = last + 1;
                access = URLs.access(uid);
            });
        });

        it('get the last access id sequence value', () => {
            return Shared.last_id('access').then(last => {
                aid = last;
            });
        });

        it('can add the housing user', () => {
            return Crud.add(all, user, URLs.user(uid));
        });

        it('can add first policy', () => {
            return Crud.add(URLs.policy(DATA.POLICY.ALLAREA.ID), DATA.POLICY.ALLAREA.DETAIL);
        });

        it('can add second policy', () => {
            return Crud.add(URLs.policy(DATA.POLICY.EXAMPLE.ID), DATA.POLICY.EXAMPLE.DETAIL);
        });

        it('disallows asking for keys with invalid roles', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(access, [{ role: DATA.ERRORS.ENUM }], { }, chakram.post))
            .then(() => Crud.bad_request(access, [{ role: DATA.ERRORS.ENUM }], { role: '' }, chakram.post))
            .then(() => Crud.bad_request(access, [{ role: DATA.ERRORS.ENUM }], { role: null }, chakram.post))
            .then(() => Crud.bad_request(access, [{ role: DATA.ERRORS.ENUM }], { role: 123 }, chakram.post))
            .then(() => Crud.bad_request(access, [{ role: DATA.ERRORS.ENUM }], { role: 'lorem' }, chakram.post));
        });

        it('disallows asking for coordinator keys without null context', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(access, [{ context: DATA.ERRORS.INVALID }], { ...coordinator, context: DATA.POLICY.ALLAREA.ID }, chakram.post))
            .then(() => Crud.bad_request(access, [{ context: DATA.ERRORS.INVALID }], { ...coordinator, context: 'lorem' }, chakram.post))
            .then(() => Crud.bad_request(access, [{ context: DATA.ERRORS.INVALID }], { ...coordinator, context: 123 }, chakram.post));
        });

        it('disallows asking for contributor keys with any context', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(access, [{ role: DATA.ERRORS.INVALID }], { role: 'contributor' }, chakram.post))
            .then(() => Crud.bad_request(access, [{ role: DATA.ERRORS.INVALID }], { role: 'contributor', context: DATA.POLICY.ALLAREA.ID }, chakram.post))
            .then(() => Crud.bad_request(access, [{ role: DATA.ERRORS.INVALID }], { role: 'contributor', context: 'lorem' }, chakram.post));
        });

        it('disallows asking for consumer keys with invalid contexts', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(access, [{ context: DATA.ERRORS.INVALID }], { role: 'consumer' }, chakram.post))
            .then(() => Crud.bad_request(access, [{ context: DATA.ERRORS.INVALID }], { ...consumer, context: '' }, chakram.post))
            .then(() => Crud.bad_request(access, [{ context: DATA.ERRORS.INVALID }], { ...consumer, context: null }, chakram.post))
            .then(() => Crud.bad_request(access, [{ context: DATA.ERRORS.INVALID }], { ...consumer, context: 'lorem' }, chakram.post))
            .then(() => Crud.bad_request(access, [{ context: DATA.ERRORS.INVALID }], { ...consumer, context: 123 }, chakram.post));
        });

        it('allows asking for coordinator keys with various valid contexts', () => {
            return Promise.resolve()
            .then(() => get_del_key(coordinator))
            .then(() => get_del_key({ ...coordinator, context: null }))
            .then(() => get_del_key({ ...coordinator, context: '' }))
            .then(() => get_del_key({ ...coordinator, context: undefined }));
        });

        it('allows asking for contributor keys with various valid contexts', () => {
            return Promise.resolve()
            .then(() => get_del_key({ ...consumer, context: DATA.POLICY.ALLAREA.ID }))
            .then(() => get_del_key({ ...consumer, context: DATA.POLICY.EXAMPLE.ID }));
        });

        it('disallows asking for refresh key with different values', () => {
            return Crud.add(access, { ...consumer, context: DATA.POLICY.ALLAREA.ID }, URLs.access(uid, ++aid), (body) => {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
            })
            .then(() => Crud.bad_request(URLs.access(uid, aid), [{ access: DATA.ERRORS.MATCH }], { ...coordinator, context: DATA.POLICY.ALLAREA.ID }, chakram.put))
            .then(() => Crud.bad_request(URLs.access(uid, aid), [{ access: DATA.ERRORS.MATCH }], { ...coordinator, context: DATA.POLICY.EXAMPLE.ID }, chakram.put))
            .then(() => Crud.bad_request(URLs.access(uid, aid), [{ access: DATA.ERRORS.MATCH }], { ...consumer, context: DATA.POLICY.EXAMPLE.ID }, chakram.put));
        });

        it('can delete the second policy', () => {
            return Crud.delete(URLs.policy(DATA.POLICY.EXAMPLE.ID));
        });

        it('can delete the first policy', () => {
            return Crud.delete(URLs.policy(DATA.POLICY.ALLAREA.ID));
        });

        it('can delete the housing user', () => {
            return Crud.delete(URLs.user(uid));
        });
    });
});
