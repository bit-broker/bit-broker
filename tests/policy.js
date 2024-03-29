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
The policy services test harness - use command 'mocha policy'

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

    // --- policy manipulation tests

    describe('policy manipulation tests', () => {

        let all = url();
        let tags = [ DATA.name(), DATA.name(), DATA.name() ];

        function url(pid, resource) { return URLs.policy(pid, resource); }

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('the policy is not there to start with', () => {
            return Crud.not_found(url(DATA.POLICY.ALLAREA.ID));
        });

        it('can add a policy with tags', () => {
            return Crud.add(url(DATA.POLICY.ALLAREA.ID), { ...DATA.POLICY.ALLAREA.DETAIL, tags } , url(DATA.POLICY.ALLAREA.ID));
        });

        it('it is present in the policy list', () => {
            return Crud.verify_all(all, [
                { id: DATA.POLICY.ALLAREA.ID, url: url(DATA.POLICY.ALLAREA.ID), name: DATA.POLICY.ALLAREA.DETAIL.name, description: DATA.POLICY.ALLAREA.DETAIL.description, tags }
            ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(url(DATA.POLICY.ALLAREA.ID), { id: DATA.POLICY.ALLAREA.ID, url: url(DATA.POLICY.ALLAREA.ID), name: DATA.POLICY.ALLAREA.DETAIL.name, description: DATA.POLICY.ALLAREA.DETAIL.description });
        });

        it('can access the policy access_control directly', () => {
            return Crud.verify(url(DATA.POLICY.ALLAREA.ID, 'access-control'), DATA.POLICY.ALLAREA.DETAIL.policy.access_control, false);
        });

        it('cannot add a duplicate policy', () => {
            return Crud.duplicate(url(DATA.POLICY.ALLAREA.ID), DATA.POLICY.ALLAREA.DETAIL);
        });

        it('can update an policy', () => {
            return Crud.update(url(DATA.POLICY.ALLAREA.ID), DATA.POLICY.EXAMPLE.DETAIL);
        });

        it('new values are present in the policy list', () => {
            return Crud.verify_all(all, [
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
            return Crud.add(url(DATA.POLICY.EXAMPLE.ID), DATA.POLICY.EXAMPLE.DETAIL, url(DATA.POLICY.EXAMPLE.ID));
        });

        it('both are present in the policy list', () => {
            return Crud.verify_all(all, [
                { id: DATA.POLICY.ALLAREA.ID, url: url(DATA.POLICY.ALLAREA.ID), name: DATA.POLICY.EXAMPLE.DETAIL.name, description: DATA.POLICY.EXAMPLE.DETAIL.description },
                { id: DATA.POLICY.EXAMPLE.ID, url: url(DATA.POLICY.EXAMPLE.ID), name: DATA.POLICY.EXAMPLE.DETAIL.name, description: DATA.POLICY.EXAMPLE.DETAIL.description }
            ]);
        });

        it('can delete the first policy', () => {
            return Crud.delete(url(DATA.POLICY.ALLAREA.ID));
        });

        it('it is gone from the policy list', () => {
            return Crud.verify_all(all, [
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
            return Crud.verify_all(all, []);
        });
    });

    // --- policy validation tests - here we test invalid entries only, on add and update

    describe('policy validation tests', () => {

        let values = DATA.POLICY.ALLAREA.DETAIL;

        function url(pid, resource) { return URLs.policy(pid, resource); }

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

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
            return Crud.bad_request(url(DATA.POLICY.INVALID.ID), [{ 'policy.legal_context.type': DATA.ERRORS.ENUM }], DATA.POLICY.INVALID.DETAIL, chakram.post);
        });

        it('cannot add a policy with an invalid data segment', () => {
            let policies = [
                { segment: true, error: DATA.ERRORS.UNPARSED },
                { segment: DATA.slug(), error: DATA.ERRORS.UNPARSED },
                { segment: { "$foo": DATA.slug() }, error: DATA.ERRORS.UNRECOGNISED },
                { segment: { "$or": true }, error: DATA.ERRORS.UNPARSED },
                { segment: { "$and": [] }, error: DATA.ERRORS.UNPARSED }
            ];

            let test = Promise.resolve()

            for (let i = 0; i < policies.length; i++) {
                let error = { 'policy.data_segment.segment_query': policies[i].error };
                let policy = { ...DATA.POLICY.ALLAREA.DETAIL, policy: { data_segment: { segment_query: policies[i].segment }}};
                test = test.then(() => Crud.bad_request(url(DATA.POLICY.ALLAREA.ID), [ error ], policy, chakram.post));
            }

            return test;
        });

        it('disallows various invalid tags', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(url(DATA.POLICY.ALLAREA.ID), [{ tags: DATA.ERRORS.TYPE }], { ...values, tags: DATA.name() }, chakram.post))
            .then(() => Crud.bad_request(url(DATA.POLICY.ALLAREA.ID), [{ tags: DATA.ERRORS.MIN }], { ...values, tags: [DATA.name(), ''] }, chakram.post))
            .then(() => Crud.bad_request(url(DATA.POLICY.ALLAREA.ID), [{ tags: DATA.ERRORS.MAX }], { ...values, tags: [DATA.name(), DATA.text(DATA.TAGS.LONGEST + 1)] }, chakram.post))
            .then(() => Crud.bad_request(url(DATA.POLICY.ALLAREA.ID), [{ tags: DATA.ERRORS.DUPLICATE }], { ...values, tags: new Array(2).fill(DATA.name()) }, chakram.post))
            .then(() => Crud.bad_request(url(DATA.POLICY.ALLAREA.ID), [{ tags: DATA.ERRORS.MAX }], { ...values, tags: new Array(DATA.TAGS.MAX + 1).fill(undefined).map(t => DATA.name()) }, chakram.post));
        });

        it('can add a policy', () => {
            return Crud.add(url(DATA.POLICY.ALLAREA.ID), DATA.POLICY.ALLAREA.DETAIL, url(DATA.POLICY.ALLAREA.ID));
        });

        it('allows various valid tags', () => {
            return Promise.resolve()
            .then(() => Crud.add_del(url(DATA.slug()), { ...values, tags: [] }))
            .then(() => Crud.add_del(url(DATA.slug()), { ...values, tags: [DATA.name()] }))
            .then(() => Crud.add_del(url(DATA.slug()), { ...values, tags: [DATA.text(DATA.TAGS.REASONABLE)] }))
            .then(() => Crud.add_del(url(DATA.slug()), { ...values, tags: [DATA.text(DATA.TAGS.LONGEST)] }))
            .then(() => Crud.add_del(url(DATA.slug()), { ...values, tags: [DATA.name(), DATA.name()] }))
            .then(() => Crud.add_del(url(DATA.slug()), { ...values, tags: new Array(DATA.TAGS.MAX).fill(undefined).map(t => DATA.name()) }))
        });

        it('cannot update a policy with an invalid policy object', () => {
            return Crud.bad_request(url(DATA.POLICY.INVALID.ID), [{ 'policy.legal_context.type': DATA.ERRORS.ENUM }], DATA.POLICY.INVALID.DETAIL, chakram.put);
        });

        it('cannot update a policy without a data segment', () => {
            let policy = JSON.parse(JSON.stringify(DATA.POLICY.ALLAREA.DETAIL));
            delete policy.policy.data_segment;
            return Crud.bad_request(url(DATA.POLICY.INVALID.ID), [{ policy: DATA.ERRORS.REQUIRED('data_segment') }], policy, chakram.put);
        });

        it('cannot update a policy without a segment query', () => {
            let policy = JSON.parse(JSON.stringify(DATA.POLICY.ALLAREA.DETAIL));
            delete policy.policy.data_segment.segment_query;
            return Crud.bad_request(url(DATA.POLICY.INVALID.ID), [{ 'policy.data_segment': DATA.ERRORS.REQUIRED('segment_query') }], policy, chakram.put);
        });

        it('cannot update a policy without a legal context', () => {
            let policy = JSON.parse(JSON.stringify(DATA.POLICY.ALLAREA.DETAIL));
            delete policy.policy.legal_context;
            return Crud.bad_request(url(DATA.POLICY.INVALID.ID), [{ policy: DATA.ERRORS.REQUIRED('legal_context') }], policy, chakram.put);
        });

        it('disallows update of various invalid tags', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(url(DATA.POLICY.INVALID.ID), [{ tags: DATA.ERRORS.TYPE }], { ...values, tags: DATA.name() }, chakram.put))
            .then(() => Crud.bad_request(url(DATA.POLICY.INVALID.ID), [{ tags: DATA.ERRORS.MIN }], { ...values, tags: [DATA.name(), ''] }, chakram.put))
            .then(() => Crud.bad_request(url(DATA.POLICY.INVALID.ID), [{ tags: DATA.ERRORS.MAX }], { ...values, tags: [DATA.name(), DATA.text(DATA.TAGS.LONGEST + 1)] }, chakram.put))
            .then(() => Crud.bad_request(url(DATA.POLICY.INVALID.ID), [{ tags: DATA.ERRORS.DUPLICATE }], { ...values, tags: new Array(2).fill(DATA.name()) }, chakram.put))
            .then(() => Crud.bad_request(url(DATA.POLICY.INVALID.ID), [{ tags: DATA.ERRORS.MAX }], { ...values, tags: new Array(DATA.TAGS.MAX + 1).fill(undefined).map(t => DATA.name()) }, chakram.put));
        });

        it('allows update of various valid tags', () => {
            return Promise.resolve()
            .then(() => Crud.update(url(DATA.POLICY.ALLAREA.ID), { ...values, tags: [] }))
            .then(() => Crud.update(url(DATA.POLICY.ALLAREA.ID), { ...values, tags: [DATA.name()] }))
            .then(() => Crud.update(url(DATA.POLICY.ALLAREA.ID), { ...values, tags: [DATA.text(DATA.TAGS.REASONABLE)] }))
            .then(() => Crud.update(url(DATA.POLICY.ALLAREA.ID), { ...values, tags: [DATA.text(DATA.TAGS.LONGEST)] }))
            .then(() => Crud.update(url(DATA.POLICY.ALLAREA.ID), { ...values, tags: [DATA.name(), DATA.name()] }))
            .then(() => Crud.update(url(DATA.POLICY.ALLAREA.ID), { ...values, tags: new Array(DATA.TAGS.MAX).fill(undefined).map(t => DATA.name()) }))
        });

        it('TODO: significant extra, detailed policy validation tests are required to be inserted here');

        it('can delete the first policy', () => {
            return Crud.delete(url(DATA.POLICY.ALLAREA.ID));
        });
    });
});
