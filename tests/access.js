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

        let uids = {}; // will be filled in during the first test
        let aids = {};
        let token = null;
        let admin = { id: 1, url: URLs.user(1), name: 'admin' };
        let user1 = { name: DATA.name(), email: DATA.pluck(DATA.EMAIL.VALID) };  // pluck to ensure different emails
        let user2 = { name: DATA.name(), email: DATA.pick(DATA.EMAIL.VALID) };
        let values1 = { role: 'coordinator' };
        let values2 = { role: 'consumer', context: DATA.POLICY.ALLAREA.ID };
        let values3 = { role: 'consumer', context: DATA.POLICY.EXAMPLE.ID };
        let all = URLs.user();

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('get the last user id sequence value', () => {
            return Shared.last_id('users').then(last => {
                uids[1] = last + 1;
                uids[2] = last + 2
            });
        });

        it('get the last access id sequence value', () => {
            return Shared.last_id('access').then(last => {
                aids[1] = last + 1;
                aids[2] = last + 2;
                aids[3] = last + 3;
                aids[4] = last + 4;
            });
        });

        it('only the admin user is present', () => {
            return Crud.verify_all(all, [admin]);
        });

        it('can add the first housing user', () => {
            return Crud.add(all, user1, URLs.user(uids[1]));
        });

        it('can add the second housing user', () => {
            return Crud.add(all, user2, URLs.user(uids[2]));
        });

        it('they are both present in the user list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: false, accesses: {} },
                { ...user2, id: uids[2], url: URLs.user(uids[2]), admin: false, accesses: {} }
            ]);
        });

        it('can add the first policy', () => {
            return Crud.add(URLs.policy(DATA.POLICY.ALLAREA.ID), DATA.POLICY.ALLAREA.DETAIL);
        });

        it('can add the second policy', () => {
            return Crud.add(URLs.policy(DATA.POLICY.EXAMPLE.ID), DATA.POLICY.EXAMPLE.DETAIL);
        });

        it('can ask for a coordinator token for first user', () => {
            return Crud.add(URLs.access(uids[1]), values1, URLs.access(uids[1], aids[1]), (body) => {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
                token = body;
            });
        });

        it('it is reflected in the admin status on user list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: true, accesses: {} },
                { ...user2, id: uids[2], url: URLs.user(uids[2]), admin: false, accesses: {} }
            ]);
        });

        it('it is reflected in the admin status on user', () => {
            return Crud.verify(URLs.user(uids[1]), { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: true, accesses: {} });
        });

        it('it is present in the user access list', () => {
            return Crud.verify_all(URLs.access(uids[1]), [
                { ...values1, id: aids[1], url: URLs.access(uids[1], aids[1]) }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(URLs.access(uids[1], aids[1]), { ...values1, id: aids[1], url: URLs.access(uids[1], aids[1]) });
        });

        it('the date is present when addressed directly', () => {
            return Crud.get(URLs.access(uids[1], aids[1]), (body) => {
                expect(body).to.be.an('object');
                expect(body.created).to.be.a('string');
                expect(body.created).to.match(new RegExp(DATA.DATE.REGEX));
            });
        });

        it('cannot ask for the same token twice', () => {
            return Crud.duplicate(URLs.access(uids[1]), values1);
        });

        it('can update to get a new coordinator token', () => {
            return Crud.update(URLs.access(uids[1], aids[1]), values1, (body) =>
            {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
                expect(body).to.not.be.eq(token);
                token = body;
            });
        });

        it('it is reflected in the admin status on user list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: true, accesses: {} },
                { ...user2, id: uids[2], url: URLs.user(uids[2]), admin: false, accesses: {} }
            ]);
        });

        it('it is reflected in the admin status on user', () => {
            return Crud.verify(URLs.user(uids[1]), { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: true, accesses: {} });
        });

        it('can ask for a coordinator token for second user', () => {
            return Crud.add(URLs.access(uids[2]), values1, URLs.access(uids[2], aids[2]), (body) => {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
                expect(body).to.not.be.eq(token);
                token = body;
            });
        });

        it('it is reflected in the admin status on user list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: true, accesses: {} },
                { ...user2, id: uids[2], url: URLs.user(uids[2]), admin: true, accesses: {} }
            ]);
        });

        it('it is reflected in the admin status on user', () => {
            return Crud.verify(URLs.user(uids[2]), { ...user2, id: uids[2], url: URLs.user(uids[2]), admin: true, accesses: {} });
        });

        it('it is present in the user access list', () => {
            return Crud.verify_all(URLs.access(uids[2]), [
                { ...values1, id: aids[2], url: URLs.access(uids[2], aids[2]) }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(URLs.access(uids[2], aids[2]), { ...values1, id: aids[2], url: URLs.access(uids[2], aids[2]) });
        });

        it('can ask for a consumer token for first user', () => {
            return Crud.add(URLs.access(uids[1]), values2, URLs.access(uids[1], aids[3]), (body) => {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
                expect(body).to.not.be.eq(token);
                token = body;
            });
        });

        it('it is reflected in the accesses list on user list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: true, accesses: { [aids[3]]: values2.context } },
                { ...user2, id: uids[2], url: URLs.user(uids[2]), admin: true, accesses: {} }
            ]);
        });

        it('it is reflected in the accesses list on user', () => {
            return Crud.verify(URLs.user(uids[1]), { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: true, accesses: { [aids[3]]: values2.context } });
        });

        it('it is present in the user access list', () => {
            return Crud.verify_all(URLs.access(uids[1]), [
                { ...values1, id: aids[1], url: URLs.access(uids[1], aids[1]) },
                { ...values2, id: aids[3], url: URLs.access(uids[1], aids[3]) }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(URLs.access(uids[1], aids[3]), { ...values2, id: aids[3], url: URLs.access(uids[1], aids[3]) });
        });

        it('can update one consumer access to get a new token', () => {
            return Crud.update(URLs.access(uids[1], aids[3]), values2, (body) =>
            {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
                expect(body).to.not.be.eq(token);
                token = body;
            });
        });

        it('it is reflected in the accesses list  on user list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: true, accesses: { [aids[3]]: values2.context } },
                { ...user2, id: uids[2], url: URLs.user(uids[2]), admin: true, accesses: {} }
            ]);
        });

        it('it is reflected in the accesses list  on user', () => {
            return Crud.verify(URLs.user(uids[1]), { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: true, accesses: { [aids[3]]: values2.context } });
        });

        it('it is present in the user access list', () => {
            return Crud.verify_all(URLs.access(uids[1]), [
                { ...values1, id: aids[1], url: URLs.access(uids[1], aids[1]) },
                { ...values2, id: aids[3], url: URLs.access(uids[1], aids[3]) }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(URLs.access(uids[1], aids[3]), { ...values2, id: aids[3], url: URLs.access(uids[1], aids[3]) });
        });

        it('cannot get access for wrong user', () => {
            return Crud.not_found(URLs.access(uids[1], aids[2]));
        });

        it('can ask for another consumer token for first user', () => {
            return Crud.add(URLs.access(uids[1]), values3, URLs.access(uids[1], aids[4]), (body) => {
                expect(body).to.be.a('string');
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
                expect(body).to.not.be.eq(token);
                token = body;
            });
        });

        it('it is reflected in the accesses list on user list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: true, accesses: { [aids[3]]: values2.context, [aids[4]]: values3.context } },
                { ...user2, id: uids[2], url: URLs.user(uids[2]), admin: true, accesses: {} }
            ]);
        });

        it('it is reflected in the accesses list on user', () => {
            return Crud.verify(URLs.user(uids[1]), { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: true, accesses: { [aids[3]]: values2.context, [aids[4]]: values3.context } });
        });

        it('it is present in the user access list', () => {
            return Crud.verify_all(URLs.access(uids[1]), [
                { ...values1, id: aids[1], url: URLs.access(uids[1], aids[1]) },
                { ...values2, id: aids[3], url: URLs.access(uids[1], aids[3]) },
                { ...values3, id: aids[4], url: URLs.access(uids[1], aids[4]) }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(URLs.access(uids[1], aids[4]), { ...values3, id: aids[4], url: URLs.access(uids[1], aids[4]) });
        });

        it('can delete the coordinator key on first user', () => {
            return Crud.delete(URLs.access(uids[1], aids[1]));
        });

        it('it is reflected in the admin status on user list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: false, accesses: { [aids[3]]: values2.context, [aids[4]]: values3.context } },
                { ...user2, id: uids[2], url: URLs.user(uids[2]), admin: true, accesses: {} }
            ]);
        });

        it('it is reflected in the admin status on user', () => {
            return Crud.verify(URLs.user(uids[1]), { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: false, accesses: { [aids[3]]: values2.context, [aids[4]]: values3.context } });
        });

        it('it is no longer present in the user access list', () => {
            return Crud.verify_all(URLs.access(uids[1]), [
                { ...values2, id: aids[3], url: URLs.access(uids[1], aids[3]) },
                { ...values3, id: aids[4], url: URLs.access(uids[1], aids[4]) }
            ]);
        });

        it('it is no longer present when addressed directly', () => {
            return Crud.not_found(URLs.access(uids[1], aids[1]));
        });

        it('cannot re-delete the coordinator key on first user', () => {
            return Crud.not_found(URLs.access(uids[1], aids[1]), undefined, chakram.delete);
        });

        it('can delete the consumer key on first user', () => {
            return Crud.delete(URLs.access(uids[1], aids[3]));
        });

        it('it is reflected in the accesses list on user list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: false, accesses: { [aids[4]]: values3.context } },
                { ...user2, id: uids[2], url: URLs.user(uids[2]), admin: true, accesses: {} }
            ]);
        });

        it('it is reflected in the accesses list on user', () => {
            return Crud.verify(URLs.user(uids[1]), { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: false, accesses: { [aids[4]]: values3.context } });
        });

        it('it is no longer present in the user access list', () => {
            return Crud.verify_all(URLs.access(uids[1]), [{ ...values3, id: aids[4], url: URLs.access(uids[1], aids[4]) }]);
        });

        it('it is no longer present when addressed directly', () => {
            return Crud.not_found(URLs.access(uids[1], aids[3]));
        });

        it('can delete the second consumer key on first user', () => {
            return Crud.delete(URLs.access(uids[1], aids[4]));
        });

        it('it is reflected in the accesses list on user list', () => {
            return Crud.verify_all(all, [
                admin,
                { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: false, accesses: {} },
                { ...user2, id: uids[2], url: URLs.user(uids[2]), admin: true, accesses: {} }
            ]);
        });

        it('it is reflected in the accesses list on user', () => {
            return Crud.verify(URLs.user(uids[1]), { ...user1, id: uids[1], url: URLs.user(uids[1]), admin: false, accesses: {} });
        });

        it('it is no longer present in the user access list', () => {
            return Crud.verify_all(URLs.access(uids[1]), []);
        });

        it('it is no longer present when addressed directly', () => {
            return Crud.not_found(URLs.access(uids[1], aids[4]));
        });

        it('can delete the first policy', () => {
            return Crud.delete(URLs.policy(DATA.POLICY.ALLAREA.ID));
        });

        it('can delete the second policy', () => {
            return Crud.delete(URLs.policy(DATA.POLICY.EXAMPLE.ID));
        });

        it('can delete the second housing user', () => {
            return Crud.delete(URLs.user(uids[1]));
        });

        it('can delete the first housing user', () => {
            return Crud.delete(URLs.user(uids[2]));
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
