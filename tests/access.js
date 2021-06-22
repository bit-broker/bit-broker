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
const Shared = require('./lib/shared.js');
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
        let user1 = { name: DATA.name(), email: DATA.pluck(DATA.EMAIL.VALID) };  // pluck to ensure different emails
        let user2 = { name: DATA.name(), email: DATA.pick(DATA.EMAIL.VALID) };
        let values1 = { role: 'coordinator' };
        let values2 = { role: 'consumer', context: DATA.POLICY.ALLAREA.ID };

        function url_user(uid) { return uid == undefined ? Shared.rest('user') : Shared.rest('user', uid); }
        function url_access(uid, aid) { return aid == undefined ? Shared.rest('user', uid, 'access') : Shared.rest('user', uid, 'access', aid); }
        function url_policy(pid) { return Shared.rest('policy', pid); }

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
            return Crud.verify_all(url_user(), []);
        });

        it('can add the first housing user', () => {
            return Crud.add(url_user(), user1, url_user(uid1));
        });

        it('can add the second housing user', () => {
            return Crud.add(url_user(), user2, url_user(uid2));
        });

        it('they are both present in the user list', () => {
            return Crud.verify_all(url_user(), [
                { ...user1, id: uid1, url: url_user(uid1) },
                { ...user2, id: uid2, url: url_user(uid2) }
            ]);
        });

        it('can add a policy', () => {
            return Crud.add(url_policy(DATA.POLICY.ALLAREA.ID), DATA.POLICY.ALLAREA.DETAIL);
        });

        it('can ask for a coordinator token for first user', () => {
            return Crud.add(url_access(uid1), values1, url_access(uid1, aid1), (body) => {
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
            });
        });

        it('it is present in the user access list', () => {
            return Crud.verify_all(url_access(uid1), [
                { ...values1, id: aid1, url: url_access(uid1, aid1) }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(url_access(uid1, aid1), { ...values1, id: aid1, url: url_access(uid1, aid1) });
        });

        it('the date is present when addressed directly', () => {
            return Crud.get(url_access(uid1, aid1), (body) => {
                expect(body.created).to.match(new RegExp(DATA.DATE.REGEX));
            });
        });

        it('cannot ask for the same token twice', () => {
            return Crud.duplicate(url_access(uid1), values1);
        });

        it('cannot update a token', () => {
            return Crud.not_found(url_access(uid1, aid1), values1, chakram.post);
        });

        it('can ask for a coordinator token for second user', () => {
            return Crud.add(url_access(uid2), values1, url_access(uid2, aid2), (body) => {
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
            });
        });

        it('it is present in the user access list', () => {
            return Crud.verify_all(url_access(uid2), [
                { ...values1, id: aid2, url: url_access(uid2, aid2) }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(url_access(uid2, aid2), { ...values1, id: aid2, url: url_access(uid2, aid2) });
        });

        it('can ask for a consumer token for first user', () => {
            return Crud.add(url_access(uid1), values2, url_access(uid1, aid3), (body) => {
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
            });
        });

        it('it is present in the user access list', () => {
            return Crud.verify_all(url_access(uid1), [
                { ...values1, id: aid1, url: url_access(uid1, aid1) },
                { ...values2, id: aid3, url: url_access(uid1, aid3) }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(url_access(uid1, aid3), { ...values2, id: aid3, url: url_access(uid1, aid3) });
        });

        it('cannot get access for wrong user', () => {
            return Crud.not_found(url_access(uid1, aid2));
        });

        it('can delete the coordinator key on first user', () => {
            return Crud.delete(url_access(uid1, aid1));
        });

        it('it is no longer present in the user access list', () => {
            return Crud.verify_all(url_access(uid1), [
                { ...values2, id: aid3, url: url_access(uid1, aid3) }
            ]);
        });

        it('it is no longer present when addressed directly', () => {
            return Crud.not_found(url_access(uid1, aid1));
        });

        it('cannot re-delete the coordinator key on first user', () => {
            return Crud.not_found(url_access(uid1, aid1), undefined, chakram.delete);
        });

        it('can delete the consumer key on first user', () => {
            return Crud.delete(url_access(uid1, aid3));
        });

        it('it is no longer present in the user access list', () => {
            return Crud.verify_all(url_access(uid1), []);
        });

        it('it is no longer present when addressed directly', () => {
            return Crud.not_found(url_access(uid1, aid3));
        });

        it('can delete the policy', () => {
            return Crud.delete(url_policy(DATA.POLICY.ALLAREA.ID));
        });

        it('can delete the second housing user', () => {
            return Crud.delete(url_user(uid1));
        });

        it('can delete the first housing user', () => {
            return Crud.delete(url_user(uid2));
        });
    });

    // --- user access validation tests - here we test invalid entries only, on add and update

    describe('user access validation tests', () => {

    });
});
