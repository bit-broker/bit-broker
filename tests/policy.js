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
const Policy = require('./lib/policy.js');
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
            return Shared.up(Shared.policy);
        });

        it('it responds to an announce request', () => {
            return Shared.announce(Shared.policy, process.env.POLICY_NAME, process.env.POLICY_BASE);
        });

        it('it responds to unknown restful resources', () => {
            return Shared.bad_route(Shared.rest('policy', DATA.slug()));
        });

        it('the database is empty', () => {
            return Shared.empty();
        });
    });

    describe('policy management tests', () => {

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('the policy is not there to start with', () => {
            return Policy.missing(DATA.DSP_ID_1);
        });

        it('cannot add a policy with an invalid policy id');

        it('cannot add a policy with an invalid policy object');

        it('can add a policy', () => {
            return Policy.add(DATA.DSP_ID_1, DATA.DSP_1);
        });

        it('it is present in the policy list', () => {
            return Policy.verify_all([{ slug: DATA.DSP_ID_1, dsp: DATA.DSP_1 }]);
        });

        it('it is present when addressed directly', () => {
            return Policy.verify(DATA.DSP_ID_1, DATA.DSP_1);
        });

        it('cannot add a duplicate policy', () => {
            return Policy.duplicate(DATA.DSP_ID_1, DATA.DSP_1);
        });

        it('cannot update a policy with an invalid policy object');

        it('can update an policy', () => {
            return Policy.update(DATA.DSP_ID_1, DATA.DSP_2);
        });

        it('new values are present in the policy list', () => {
            return Policy.verify_all([{ slug: DATA.DSP_ID_1, dsp: DATA.DSP_2 }]);
        });

        it('new values are present when addressed directly', () => {
            return Policy.verify(DATA.DSP_ID_1, DATA.DSP_2);
        });

        it('the second policy is not there to start with', () => {
            return Policy.missing(DATA.DSP_ID_2);
        });

        it('can add a second policy', () => {
            return Policy.add(DATA.DSP_ID_2, DATA.DSP_2);
        });

        it('both are present in the policy list', () => {
            return Policy.verify_all([
                { slug: DATA.DSP_ID_1, dsp: DATA.DSP_2 },
                { slug: DATA.DSP_ID_2, dsp: DATA.DSP_2 }
            ]);
        });

        it('can delete the first policy', () => {
            return Policy.delete(DATA.DSP_ID_1);
        });

        it('it is gone from the policy list', () => {
            return Policy.verify_all([{ slug: DATA.DSP_ID_2, dsp: DATA.DSP_2 }]);
        });

        it('the policy is gone when addressed directly', () => {
            return Policy.missing(DATA.DSP_ID_1);
        });

        it('can delete the second policy', () => {
            return Policy.delete(DATA.DSP_ID_2);
        });
    });

});
