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

  The policy server test harness - use command 'mocha policy'

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

describe('Policy Tests', function() {

    this.timeout(0); // we are not interested in non-functional tests here

    // --- before any tests are run

    before(() => {
        return Shared.before_any();
    });

    // --- after all the tests have been run

    after(() => {
        return Shared.after_all();
    });

    // --- start up tests

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

    // --- policy manipulation tests

    describe('policy manipulation tests', () => {

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        function url(slug = '', resource = undefined) { return resource ? Shared.rest('policy', slug, resource) : Shared.rest('policy', slug); }

        it('the policy is not there to start with', () => {
            return Crud.not_found(url(DATA.POLICY.ALLAREA.ID));
        });

        it('can add a policy', () => {
            return Crud.add(url(DATA.POLICY.ALLAREA.ID), DATA.POLICY.ALLAREA.DETAIL);
        });

        it('it is present in the policy list', () => {
            return Crud.verify_all(url(), [
                { id: DATA.POLICY.ALLAREA.ID, url: url(DATA.POLICY.ALLAREA.ID), name: DATA.POLICY.ALLAREA.DETAIL.name, description: DATA.POLICY.ALLAREA.DETAIL.description }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(url(DATA.POLICY.ALLAREA.ID), { id: DATA.POLICY.ALLAREA.ID, url: url(DATA.POLICY.ALLAREA.ID), name: DATA.POLICY.ALLAREA.DETAIL.name, description: DATA.POLICY.ALLAREA.DETAIL.description });
        });

        it('can access the policy access_control directly', () => {
            return Crud.verify(url(DATA.POLICY.ALLAREA.ID, 'access_control'), DATA.POLICY.ALLAREA.DETAIL.policy.access_control, false);
        });

        it('cannot add a duplicate policy', () => {
            return Crud.duplicate(url(DATA.POLICY.ALLAREA.ID), DATA.POLICY.ALLAREA.DETAIL);
        });

        it('can update an policy', () => {
            return Crud.update(url(DATA.POLICY.ALLAREA.ID), DATA.POLICY.EXAMPLE.DETAIL);
        });

        it('new values are present in the policy list', () => {
            return Crud.verify_all(url(), [
                { id: DATA.POLICY.ALLAREA.ID, url: url(DATA.POLICY.ALLAREA.ID), name: DATA.POLICY.EXAMPLE.DETAIL.name, description: DATA.POLICY.EXAMPLE.DETAIL.description }
            ]);
        });

        it('new values are present when addressed directly', () => {
            return Crud.verify(url(DATA.POLICY.ALLAREA.ID), { id: DATA.POLICY.ALLAREA.ID, url: url(DATA.POLICY.ALLAREA.ID), name: DATA.POLICY.EXAMPLE.DETAIL.name, description: DATA.POLICY.EXAMPLE.DETAIL.description });
        });

        it('the second policy is not there to start with', () => {
            return Crud.not_found(url(DATA.POLICY.EXAMPLE.ID));
        });

        it('can add a second policy', () => {
            return Crud.add(url(DATA.POLICY.EXAMPLE.ID), DATA.POLICY.EXAMPLE.DETAIL);
        });

        it('both are present in the policy list', () => {
            return Crud.verify_all(url(), [
                { id: DATA.POLICY.ALLAREA.ID, url: url(DATA.POLICY.ALLAREA.ID), name: DATA.POLICY.EXAMPLE.DETAIL.name, description: DATA.POLICY.EXAMPLE.DETAIL.description },
                { id: DATA.POLICY.EXAMPLE.ID, url: url(DATA.POLICY.EXAMPLE.ID), name: DATA.POLICY.EXAMPLE.DETAIL.name, description: DATA.POLICY.EXAMPLE.DETAIL.description }
            ]);
        });

        it('can delete the first policy', () => {
            return Crud.delete(url(DATA.POLICY.ALLAREA.ID));
        });

        it('it is gone from the policy list', () => {
            return Crud.verify_all(url(), [
                { id: DATA.POLICY.EXAMPLE.ID, url: url(DATA.POLICY.EXAMPLE.ID), name: DATA.POLICY.EXAMPLE.DETAIL.name, description: DATA.POLICY.EXAMPLE.DETAIL.description }
            ]);
        });

        it('the policy is gone when addressed directly', () => {
            return Crud.not_found(url(DATA.POLICY.ALLAREA.ID));
        });

        it('can delete the second policy', () => {
            return Crud.delete(url(DATA.POLICY.EXAMPLE.ID));
        });

        it('the policy list is empty', () => {
            return Crud.verify_all(url(), []);
        });
    });

    // --- policy validation tests - here we test invalid entries only, on add and update

    describe('policy validation tests', () => {

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        function url(slug) { return Shared.rest('policy', slug); }

        it('cannot open a policy with various invalid ids', () => {
            let test = Promise.resolve()
            .then(() => Crud.bad_request(url(DATA.slug(DATA.SLUG.SHORTEST - 1)), [{ slug: DATA.ERRORS.MIN }], DATA.POLICY.ALLAREA.DETAIL, chakram.post))
            .then(() => Crud.bad_request(url(DATA.slug(DATA.SLUG.LONGEST + 1)), [{ slug: DATA.ERRORS.MAX }], DATA.POLICY.ALLAREA.DETAIL, chakram.post));

            for (let i = 0; i < DATA.SLUG.INVALID.length; i++) {
                test = test.then(() => Crud.bad_request(url(DATA.SLUG.INVALID[i]), [{ slug: DATA.ERRORS.FORMAT }], DATA.POLICY.ALLAREA.DETAIL, chakram.post));
            }

            return test;
        });

        it('cannot add a policy with an invalid policy object', () => {
            return Crud.bad_request(url(DATA.POLICY.INVALID.ID), [{ legal_context: DATA.ERRORS.ENUM }], DATA.POLICY.INVALID.DETAIL, chakram.post);
        });

        it('can add a policy', () => {
            return Crud.add(url(DATA.POLICY.ALLAREA.ID), DATA.POLICY.ALLAREA.DETAIL);
        });

        it('cannot update a policy with an invalid policy object', () => {
            return Crud.bad_request(url(DATA.POLICY.INVALID.ID), [{ legal_context: DATA.ERRORS.ENUM }], DATA.POLICY.INVALID.DETAIL, chakram.put);
        });

        it('can delete the first policy', () => {
            return Crud.delete(url(DATA.POLICY.ALLAREA.ID), DATA.POLICY.ALLAREA.DETAIL);
        });
    });
});
