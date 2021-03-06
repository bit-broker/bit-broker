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
The coordinator test harness - use command 'mocha coordinator'

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

describe('Coordinator Service Tests', function() {

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
            return Shared.up(process.env.TESTS_COORDINATOR);
        });

        it('it responds to an announce request', () => {
            return Shared.announce(process.env.TESTS_COORDINATOR, 'coordinator');
        });

        it('the database is empty', () => {
            return Shared.empty();
        });
    });

    // --- bootstrap tests

    describe('bootstrap tests', () => {
        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('the bootstrap user is present', () => {
            let id = 1;
            let url = URLs.user(id);
            let name = process.env.BOOTSTRAP_USER_NAME;
            let email = process.env.BOOTSTRAP_USER_EMAIL;
            let coordinator = true;
            let addendum = {};
            let accesses = {};

            return Crud.verify(url, { id, url, name, email, coordinator, accesses, addendum });
        });
    });

    // --- entity manipulation tests

    describe('entity manipulation tests', () => {
        let slug1 = DATA.pluck(DATA.SLUG.VALID); // pluck - so as to never get duplicate
        let slug2 = DATA.pick(DATA.SLUG.VALID);
        let entity1 = URLs.entity(slug1);
        let entity2 = URLs.entity(slug2);
        let values1 = { name: DATA.name(), description: DATA.text(DATA.DESCRIPTION.REASONABLE), tags: [ DATA.name(), DATA.name(), DATA.name() ] }; // with tags
        let values2 = { name: DATA.name(), description: DATA.text(DATA.DESCRIPTION.REASONABLE + 1), icon: DATA.name() }; // with icon, +1 - so as to be different from first
        let all = URLs.entity();

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('the entity is not there to start with', () => {
            return Crud.not_found(entity1);
        });

        it('can add an entity type', () => {
            return Crud.add(entity1, values1, entity1);
        });

        it('it is present in the entity type list', () => {
            return Crud.verify_all(all, [ { id: slug1, url: entity1, ...values1 } ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(entity1, { id: slug1, url: entity1, ...values1 });
        });

        it('it has empty timeseries and schema when addressed directly', () => {
            return Crud.verify(entity1, { timeseries: {}, schema: {} });
        });

        it('cannot add a duplicate entity type', () => {
            return Crud.duplicate(entity1, values1);
        });

        it('can update an entity type', () => {
            return Crud.update(entity1, values2);
        });

        it('new values are present in the entity type list', () => {
            return Crud.verify_all(all, [{ id: slug1, url: entity1, ...values2 }]);
        });

        it('new values are present when addressed directly', () => {
            return Crud.verify(entity1, { id: slug1, url: entity1, ...values2 });
        });

        it('it still has empty timeseries and schema when addressed directly', () => {
            return Crud.verify(entity1, { timeseries: {}, schema: {} });
        });

        it('the second entity is not there to start with', () => {
            return Crud.not_found(entity2);
        });

        it('can add a second entity type', () => {
            return Crud.add(entity2, values2, entity2);
        });

        it('both are present in the entity type list', () => {
            return Crud.verify_all(all, [
                { id: slug1, url: entity1, ...values2 },
                { id: slug2, url: entity2, ...values2 }
            ]);
        });

        it('can delete the first entity type', () => {
            return Crud.delete(entity1);
        });

        it('it is gone from the entity type list', () => {
            return Crud.verify_all(all, [{ id: slug2, url: entity2, ...values2 }]);
        });

        it('the entity is gone when addressed directly', () => {
            return Crud.not_found(entity1);
        });

        it('cannot re-delete the entity type', () => {
            return Crud.not_found(entity1, undefined, chakram.delete);
        });

        it('cannot update the entity type', () => {
            return Crud.not_found(entity1, values1, chakram.put);
        });

        it('can delete the second entity type', () => {
            return Crud.delete(entity2);
        });
    });

    // --- entity timeseries tests

    describe('entity timeseries tests', () => {
        let slug = DATA.pick(DATA.SLUG.VALID);
        let entity = URLs.entity(slug);
        let values = { name: DATA.name(), description: DATA.text(DATA.DESCRIPTION.REASONABLE) };
        let all = URLs.entity();
        let ts1 = { period: DATA.duration(), value: DATA.text(), unit: DATA.text() };
        let ts2 = { period: DATA.duration(), value: DATA.text(), unit: DATA.text() };

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('the entity is not there to start with', () => {
            return Crud.not_found(entity);
        });

        it('can add an entity type with first timeseries', () => {
            return Crud.add(entity, {...values, timeseries: { ts1 }}, entity);
        });

        it('it is present in the entity type list', () => {
            return Crud.verify_all(all, [ { id: slug, url: entity, ...values } ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(entity, { id: slug, url: entity, ...values });
        });

        it('it has the timeseries present when addressed directly', () => {
            return Crud.verify(entity, { timeseries: { ts1 }});
        });

        it('can update an entity type with second timeseries', () => {
            return Crud.update(entity, {...values, timeseries: { ts2 }});
        });

        it('new timeseries present is when addressed directly', () => {
            return Crud.verify(entity, { timeseries: { ts2 }});
        });

        it('can update an entity type with no timeseries', () => {
            return Crud.update(entity, {...values, timeseries: { }});
        });

        it('no timeseries present is when addressed directly', () => {
            return Crud.verify(entity, { timeseries: {}});
        });

        it('can delete the entity type', () => {
            return Crud.delete(entity);
        });

        it('it is gone from the entity type list', () => {
            return Crud.verify_all(all, []);
        });
    });

    // --- entity validation tests - here we test valid and invalid, on add and update

    describe('entity validation tests', () => {
        let entity = URLs.entity(DATA.pick(DATA.SLUG.VALID));
        let values = { name: DATA.name(), description: DATA.text(), icon: DATA.name(), tags: [ DATA.name(), DATA.name(), DATA.name() ] };
        let period = DATA.duration();
        let value = DATA.text();
        let unit = DATA.text();

        function some_name() { return URLs.entity(DATA.slug(DATA.SLUG.REASONABLE)); } // some reasonable name

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('allows various valid slug', () => {
            return Promise.resolve()
            .then(() => Crud.add_del(URLs.entity(DATA.slug(DATA.SLUG.SHORTEST)), values))
            .then(() => Crud.add_del(URLs.entity(DATA.slug(DATA.SLUG.LONGEST)), values))
            .then(() => Crud.add_del(URLs.entity(DATA.slug(DATA.SLUG.REASONABLE).toUpperCase()), values))
            .then(() => Crud.add_del(URLs.entity(DATA.slug(DATA.SLUG.REASONABLE).concat('   ')), values));
        });

        it('allows various valid names', () => {
            return Promise.resolve()
            .then(() => Crud.add_del(some_name(), { ...values, name: DATA.name(DATA.NAME.SHORTEST) }))
            .then(() => Crud.add_del(some_name(), { ...values, name: DATA.name(DATA.NAME.LONGEST) }));
        });

        it('allows various valid descriptions', () => {
            return Promise.resolve()
            .then(() => Crud.add_del(some_name(), { ...values, description: DATA.text(DATA.DESCRIPTION.SHORTEST) }))
            .then(() => Crud.add_del(some_name(), { ...values, description: DATA.text(DATA.DESCRIPTION.LONGEST) }));
        });

        it('allows various valid tags', () => {
            return Promise.resolve()
            .then(() => Crud.add_del(some_name(), { ...values, tags: [] }))
            .then(() => Crud.add_del(some_name(), { ...values, tags: [DATA.name()] }))
            .then(() => Crud.add_del(some_name(), { ...values, tags: [DATA.text(DATA.TAGS.REASONABLE)] }))
            .then(() => Crud.add_del(some_name(), { ...values, tags: [DATA.text(DATA.TAGS.LONGEST)] }))
            .then(() => Crud.add_del(some_name(), { ...values, tags: [DATA.name(), DATA.name()] }))
            .then(() => Crud.add_del(some_name(), { ...values, tags: new Array(DATA.TAGS.MAX).fill(undefined).map(t => DATA.name()) }))
        });

        it('allows various valid icons', () => {
            return Promise.resolve()
            .then(() => Crud.add_del(some_name(), { ...values, icon: '' }))
            .then(() => Crud.add_del(some_name(), { ...values, icon: DATA.text(DATA.ICON.REASONABLE) }))
            .then(() => Crud.add_del(some_name(), { ...values, icon: DATA.text(DATA.ICON.LONGEST) }));
        });

        it('allows add with trailing slash', () => {
            let slashed = entity + '/';
            return Crud.add(slashed, values, entity)
            .then (() => Crud.verify(slashed, values))
            .then (() => Crud.delete(slashed));
        });

        it('disallows various invalid slugs', () => {
            let test = Promise.resolve()
            .then(() => Crud.bad_request(URLs.entity(DATA.slug(DATA.SLUG.SHORTEST - 1)), [{ slug: DATA.ERRORS.MIN }], values, chakram.post))
            .then(() => Crud.bad_request(URLs.entity(DATA.slug(DATA.SLUG.LONGEST + 1)), [{ slug: DATA.ERRORS.MAX }], values, chakram.post));

            for (let i = 0; i < DATA.SLUG.INVALID.length; i++) {
                test = test.then(() => Crud.bad_request(URLs.entity(DATA.SLUG.INVALID[i]), [{ slug: DATA.ERRORS.FORMAT }], values, chakram.post));
            }

            return test;
        });

        it('disallows various invalid names', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(some_name(), [{ name: DATA.ERRORS.MIN }], { description: DATA.text() }, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ name: DATA.ERRORS.MIN }], { ...values, name: '' }, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ name: DATA.ERRORS.MIN }], { ...values, name: null }, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ name: DATA.ERRORS.MAX }], { ...values, name: DATA.text(DATA.NAME.LONGEST + 1) }, chakram.post));
        });

        it('disallows various invalid descriptions', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(some_name(), [{ description: DATA.ERRORS.MIN }], { name: DATA.name() }, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ description: DATA.ERRORS.MIN }], { ...values, description: '' }, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ description: DATA.ERRORS.MIN }], { ...values, description: null }, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ description: DATA.ERRORS.MAX }], { ...values, description: DATA.text(DATA.DESCRIPTION.LONGEST + 1) }, chakram.post));
        });

        it('disallows various invalid tags', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(some_name(), [{ tags: DATA.ERRORS.TYPE }], { ...values, tags: DATA.name() }, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ tags: DATA.ERRORS.MIN }], { ...values, tags: [DATA.name(), ''] }, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ tags: DATA.ERRORS.MAX }], { ...values, tags: [DATA.name(), DATA.text(DATA.TAGS.LONGEST + 1)] }, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ tags: DATA.ERRORS.DUPLICATE }], { ...values, tags: new Array(2).fill(DATA.name()) }, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ tags: DATA.ERRORS.MAX }], { ...values, tags: new Array(DATA.TAGS.MAX + 1).fill(undefined).map(t => DATA.name()) }, chakram.post));
        });

        it('disallows various invalid icon', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(some_name(), [{ icon: DATA.ERRORS.MAX }], { ...values, icon: DATA.text(DATA.ICON.LONGEST + 1) }, chakram.post));
        });

        it('disallows various invalid timeseries', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(some_name(), [{ timeseries: DATA.ERRORS.TYPE }], { ...values, timeseries: []}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ timeseries: DATA.ERRORS.TYPE }], { ...values, timeseries: DATA.text()}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ timeseries: DATA.ERRORS.MIN }], { ...values, timeseries: { 'ts': {} }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ timeseries: DATA.ERRORS.FORMAT }], { ...values, timeseries: { 'ts 1': true }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ timeseries: DATA.ERRORS.FORMAT }], { ...values, timeseries: { '-ts1': true }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ timeseries: DATA.ERRORS.FORMAT }], { ...values, timeseries: { 'ts1!': true }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1': DATA.ERRORS.REQUIRED('period') }], { ...values, timeseries: { 'ts1': { value, unit } }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1': DATA.ERRORS.REQUIRED('value') }], { ...values, timeseries: { 'ts1': { period, unit } }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1': DATA.ERRORS.REQUIRED('unit') }], { ...values, timeseries: { 'ts1': { period, value } }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1': DATA.ERRORS.REQUIRED('period') }], { ...values, timeseries: { 'ts1': { } }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1': DATA.ERRORS.ADDITIONAL }], { ...values, timeseries: { 'ts1': { foo: 1, period, value, unit } }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1.period': DATA.ERRORS.TYPE }], { ...values, timeseries: { 'ts1': { period: 1, value, unit } }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1.value': DATA.ERRORS.TYPE }], { ...values, timeseries: { 'ts1': { period, value: 1, unit } }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1.unit': DATA.ERRORS.TYPE }], { ...values, timeseries: { 'ts1': { period, value, unit: 1 } }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1.period': DATA.ERRORS.FORMAT }], { ...values, timeseries: { 'ts1': { period: "", value, unit } }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1.period': DATA.ERRORS.FORMAT }], { ...values, timeseries: { 'ts1': { period: "1H", value, unit } }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1.period': DATA.ERRORS.FORMAT }], { ...values, timeseries: { 'ts1': { period: "P1H", value, unit } }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1': DATA.ERRORS.TYPE }], { ...values, timeseries: { 'ts1': null }}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1': DATA.ERRORS.TYPE }], { ...values, timeseries: { 'ts1': DATA.text() }}, chakram.post));
        });

        it('disallows various invalid schemas', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(some_name(), [{ schema: DATA.ERRORS.TYPE }], { ...values, schema: []}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ schema: DATA.ERRORS.TYPE }], { ...values, schema: 1}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ schema: DATA.ERRORS.TYPE }], { ...values, schema: true}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ schema: DATA.ERRORS.TYPE }], { ...values, schema: DATA.text()}, chakram.post))
            .then(() => Crud.bad_request(some_name(), [{ schema: DATA.ERRORS.INVALID }], { ...values, schema: DATA.text()}, chakram.post));
        });

        it('create update test entity', () => {
            return Crud.add(entity, values, entity);
        });

        it('allows update of various valid names', () => {
            return Promise.resolve()
            .then(() => Crud.update(entity, { ...values, name: DATA.name(DATA.NAME.SHORTEST) }))
            .then(() => Crud.update(entity, { ...values, name: DATA.name(DATA.NAME.LONGEST) }));
        });

        it('allows update of various valid descriptions', () => {
            return Promise.resolve()
            .then(() => Crud.update(entity, { ...values, description: DATA.text(DATA.DESCRIPTION.SHORTEST) }))
            .then(() => Crud.update(entity, { ...values, description: DATA.text(DATA.DESCRIPTION.LONGEST) }));
        });

        it('allows update of various valid tags', () => {
            return Promise.resolve()
            .then(() => Crud.update(entity, { ...values, tags: [] }))
            .then(() => Crud.update(entity, { ...values, tags: [DATA.name()] }))
            .then(() => Crud.update(entity, { ...values, tags: [DATA.text(DATA.TAGS.REASONABLE)] }))
            .then(() => Crud.update(entity, { ...values, tags: [DATA.text(DATA.TAGS.LONGEST)] }))
            .then(() => Crud.update(entity, { ...values, tags: [DATA.name(), DATA.name()] }))
            .then(() => Crud.update(entity, { ...values, tags: new Array(DATA.TAGS.MAX).fill(undefined).map(t => DATA.name()) }))
        });

        it('allows update of various valid icons', () => {
            return Promise.resolve()
            .then(() => Crud.update(entity, { ...values, icon: '' }))
            .then(() => Crud.update(entity, { ...values, icon: DATA.text(DATA.ICON.REASONABLE) }))
            .then(() => Crud.update(entity, { ...values, icon: DATA.text(DATA.ICON.LONGEST) }));
        });

        it('disallows update of various invalid names', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(entity, [{ name: DATA.ERRORS.MIN }], { description: DATA.text() }, chakram.put))
            .then(() => Crud.bad_request(entity, [{ name: DATA.ERRORS.MIN }], { ...values, name: '' }, chakram.put))
            .then(() => Crud.bad_request(entity, [{ name: DATA.ERRORS.MIN }], { ...values, name: null }, chakram.put))
            .then(() => Crud.bad_request(entity, [{ name: DATA.ERRORS.MAX }], { ...values, name: DATA.text(DATA.NAME.LONGEST + 1) }, chakram.put));
        });

        it('disallows update of various invalid descriptions', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(entity, [{ description: DATA.ERRORS.MIN }], { name: DATA.name() }, chakram.put))
            .then(() => Crud.bad_request(entity, [{ description: DATA.ERRORS.MIN }], { ...values, description: '' }, chakram.put))
            .then(() => Crud.bad_request(entity, [{ description: DATA.ERRORS.MIN }], { ...values, description: null }, chakram.put))
            .then(() => Crud.bad_request(entity, [{ description: DATA.ERRORS.MAX }], { ...values, description: DATA.text(DATA.DESCRIPTION.LONGEST + 1) }, chakram.put));
        });

        it('disallows update of various invalid tags', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(entity, [{ tags: DATA.ERRORS.TYPE }], { tags: DATA.name() }, chakram.put))
            .then(() => Crud.bad_request(entity, [{ tags: DATA.ERRORS.MIN }], { tags: [DATA.name(), ''] }, chakram.put))
            .then(() => Crud.bad_request(entity, [{ tags: DATA.ERRORS.MAX }], { tags: [DATA.name(), DATA.text(DATA.TAGS.LONGEST + 1)] }, chakram.put))
            .then(() => Crud.bad_request(entity, [{ tags: DATA.ERRORS.DUPLICATE }], { tags: new Array(2).fill(DATA.name()) }, chakram.put))
            .then(() => Crud.bad_request(entity, [{ tags: DATA.ERRORS.MAX }], { tags: new Array(DATA.TAGS.MAX + 1).fill(undefined).map(t => DATA.name()) }, chakram.put));
        });

        it('disallows update of various invalid icons', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(entity, [{ icon: DATA.ERRORS.MAX }], { ...values, icon: DATA.text(DATA.ICON.LONGEST + 1) }, chakram.put));
        });

        it('disallows update of various invalid timeseries', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(some_name(), [{ timeseries: DATA.ERRORS.TYPE }], { ...values, timeseries: []}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ timeseries: DATA.ERRORS.TYPE }], { ...values, timeseries: DATA.text()}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ timeseries: DATA.ERRORS.MIN }], { ...values, timeseries: { 'ts': {} }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ timeseries: DATA.ERRORS.FORMAT }], { ...values, timeseries: { 'ts 1': true }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ timeseries: DATA.ERRORS.FORMAT }], { ...values, timeseries: { '-ts1': true }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ timeseries: DATA.ERRORS.FORMAT }], { ...values, timeseries: { 'ts1!': true }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1': DATA.ERRORS.REQUIRED('period') }], { ...values, timeseries: { 'ts1': { value, unit } }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1': DATA.ERRORS.REQUIRED('value') }], { ...values, timeseries: { 'ts1': { period, unit } }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1': DATA.ERRORS.REQUIRED('unit') }], { ...values, timeseries: { 'ts1': { period, value } }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1': DATA.ERRORS.REQUIRED('period') }], { ...values, timeseries: { 'ts1': { } }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1': DATA.ERRORS.ADDITIONAL }], { ...values, timeseries: { 'ts1': { foo: 1, period, value, unit } }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1.period': DATA.ERRORS.TYPE }], { ...values, timeseries: { 'ts1': { period: 1, value, unit } }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1.value': DATA.ERRORS.TYPE }], { ...values, timeseries: { 'ts1': { period, value: 1, unit } }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1.unit': DATA.ERRORS.TYPE }], { ...values, timeseries: { 'ts1': { period, value, unit: 1 } }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1.period': DATA.ERRORS.FORMAT }], { ...values, timeseries: { 'ts1': { period: "", value, unit } }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1.period': DATA.ERRORS.FORMAT }], { ...values, timeseries: { 'ts1': { period: "1H", value, unit } }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1.period': DATA.ERRORS.FORMAT }], { ...values, timeseries: { 'ts1': { period: "P1H", value, unit } }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1': DATA.ERRORS.TYPE }], { ...values, timeseries: { 'ts1': null }}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ 'timeseries.ts1': DATA.ERRORS.TYPE }], { ...values, timeseries: { 'ts1': DATA.text() }}, chakram.put));
        });

        it('disallows update of various invalid schemas', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(some_name(), [{ schema: DATA.ERRORS.TYPE }], { ...values, schema: []}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ schema: DATA.ERRORS.TYPE }], { ...values, schema: 1}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ schema: DATA.ERRORS.TYPE }], { ...values, schema: true}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ schema: DATA.ERRORS.TYPE }], { ...values, schema: DATA.text()}, chakram.put))
            .then(() => Crud.bad_request(some_name(), [{ schema: DATA.ERRORS.INVALID }], { ...values, schema: DATA.text()}, chakram.put));
        });

        it('delete update test entity', () => {
            return Crud.delete(entity);
        });
    });

    // --- connector manipulation tests

    describe('connector manipulation tests', () => {
        let entity = DATA.pluck(DATA.SLUG.VALID); // pluck - so as to never get duplicate
        let slug1 = DATA.pluck(DATA.SLUG.VALID); // pluck - so as to never get duplicate
        let slug2 = DATA.pick(DATA.SLUG.VALID);
        let cid1 = null; // filled in during tests
        let cid2 = null; // filled in during tests
        let connector1 = URLs.connector(entity, slug1);
        let connector2 = URLs.connector(entity, slug2);
        let all = URLs.connector(entity);
        let base = {
            name: DATA.name(DATA.NAME.REASONABLE),
            description: DATA.text(DATA.DESCRIPTION.REASONABLE)
        }
        let values1 = {
            name: DATA.name(DATA.NAME.REASONABLE),
            description: DATA.text(DATA.DESCRIPTION.REASONABLE),
            webhook: DATA.pluck(DATA.WEBHOOK.VALID), // pluck - so as to never get duplicate
            cache: DATA.integer(DATA.CACHE.REASONABLE),
        };
        let values2 = {
            name: DATA.name(DATA.NAME.REASONABLE),
            description: DATA.text(DATA.DESCRIPTION.REASONABLE + 1), // +1 - so as to be different from first
            webhook: DATA.pick(DATA.WEBHOOK.VALID),
            cache: DATA.integer(DATA.CACHE.REASONABLE),
        };
        let defaults = {
            webhook: null,
            cache: 0
        };

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('no connectors are returned for a missing parent entity', () => {
            return Crud.not_found(URLs.entity(entity));
        });

        it('cannot add a connector to a missing parent entity', () => {
            return Crud.not_found(connector1, values1, chakram.post);
        });

        it('cannot update a connector to a missing parent entity', () => {
            return Crud.not_found(connector1, values1, chakram.put);
        });

        it('cannot delete a connector to a missing parent entity', () => {
            return Crud.not_found(connector1, undefined, chakram.delete);
        });

        it('add the housing entity', () => {
            return Crud.add(URLs.entity(entity), base, URLs.entity(entity));
        });

        it('it has no connectors', () => {
            return Crud.verify_all(all, []);
        });

        it('add the first connector to the entity', () => {
            return Crud.add(connector1, values1, connector1, body => {
                expect(body).to.be.an('object');
                expect(body.id).to.be.a('string');
                expect(body.id).to.match(new RegExp(DATA.GUID.REGEX));
                expect(body.token).to.be.a('string');
                expect(body.token).to.match(new RegExp(DATA.KEY.REGEX));
                cid1 = body.id;
            })
            .then (() => { values1.webhook = values1.webhook.replace(/\/$/g, ''); }) // insertion will strip any trailing slashes from webhook url
        });

        it('it is present in the entities connector list', () => {
            return Crud.verify_all(all, [
                { id: slug1, url: connector1, name: values1.name, description: values1.description }
            ]);
        });

        it('it is present when the connector is addressed directly', () => {
            return Crud.verify(connector1, values1);
        });

        it('cannot add a duplicate connector to the entity', () => {
            return Crud.duplicate(connector1, values1);
        });

        it('can add a second connector', () => {
            return Crud.add(connector2, values2, connector2, body => {
                expect(body).to.be.an('object');
                expect(body.id).to.be.a('string');
                expect(body.id).to.match(new RegExp(DATA.GUID.REGEX));
                expect(body.token).to.be.a('string');
                expect(body.token).to.match(new RegExp(DATA.KEY.REGEX));
                cid2 = body.id;
            })
            .then (() => { values2.webhook = values2.webhook.replace(/\/$/g, ''); }) // insertion will strip any trailing slashes from webhook url
        });

        it('both are present in the connector list', () => {
            return Crud.verify_all(all, [
                { id: slug1, url: connector1, name: values1.name, description: values1.description },
                { id: slug2, url: connector2, name: values2.name, description: values2.description }
            ]);
        });

        it('can update a connector', () => {
            return Crud.update(connector1, values2);
        });

        it('update is present in the connector list', () => {
            return Crud.verify_all(all, [
                { id: slug1, url: connector1, name: values2.name, description: values2.description },
                { id: slug2, url: connector2, name: values2.name, description: values2.description }
            ]);
        });

        it('update is present when the connector is addressed directly', () => {
            return Crud.verify(connector1, values2);
        });

        it('can delete the first connector from the entity', () => {
            return Crud.delete(connector1);
        });

        it('it is no longer present in the entities connector list', () => {
            return Crud.verify_all(all, [
                { id: slug2, url: connector2, name: values2.name, description: values2.description }
            ]);
        });

        it('it is no longer present when the connector is addressed directly', () => {
            return Crud.not_found(connector1);
        });

        it('cannot re-delete the connector from the entity', () => {
            return Crud.not_found(connector1, undefined, chakram.delete);
        });

        it('can delete the second connector from the entity', () => {
            return Crud.delete(connector2);
        });

        it('it is gone from the entity type list', () => {
            return Crud.verify_all(all, []);
        });

        it('the entity is gone when addressed directly', () => {
            return Crud.not_found(connector2);
        });

        it('re-adding the first connector gives the same contribution id', () => {
            return Crud.add(connector1, values1, connector1, body => {
                expect(body).to.be.an('object');
                expect(body.id).to.be.a('string');
                expect(body.id).to.be.eq(cid1);
            });
        });

        it('re-adding the second connector gives the same contribution id', () => {
            return Crud.add(connector2, values2, connector2, body => {
                expect(body).to.be.an('object');
                expect(body.id).to.be.a('string');
                expect(body.id).to.be.eq(cid2);
            });
        });

        it('can delete both connectors from the entity', () => {
            let tests = [];

            tests.push(Crud.delete(connector1));
            tests.push(Crud.delete(connector2));

            return Promise.all(tests);
        });

        it('can add connector with a missing cache and webhook', () => {
            return Crud.add_del(connector1, base, defaults);
        });

        it('can add connector with an empty webhook', () => {
            return Crud.add_del(connector1, { ...base, webhook: '' }, defaults);
        });

        it('can add connector with a null cache and webhook', () => {
            return Crud.add_del(connector1, { ...base, webhook: null, cache: null }, defaults);
        });

        it('can delete the entity type and all hence its connectors', () => {
            return Crud.delete(URLs.entity(entity));
        });
    });

    // --- connector timeseries tests

    describe('connector timeseries tests', () => {
        let entity = DATA.slug();
        let base = { name: DATA.name(), description: DATA.text(DATA.DESCRIPTION.REASONABLE) };
        let values = { name: DATA.name(), description: DATA.text(DATA.DESCRIPTION.REASONABLE) };
        let slug1 = DATA.pluck(DATA.SLUG.VALID); // pluck - so as to never get duplicate
        let slug2 = DATA.pick(DATA.SLUG.VALID);

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('add the housing entity without a timeseries', () => {
            return Crud.add(URLs.entity(entity), base);
        });

        it('can add the connector without a webhook', () => {
            return Crud.add(URLs.connector(entity, slug1), values);
        });

        it('can add the connector with a webhook', () => {
            return Crud.add(URLs.connector(entity, slug2), { ...values, webhook: DATA.pick(DATA.WEBHOOK.VALID) });
        });

        it('can delete the entity type and all hence its connectors', () => {
            return Crud.delete(URLs.entity(entity));
        });

        it('add the housing entity with a timeseries', () => {
            return Crud.add(URLs.entity(entity), { ...base, timeseries: { 'ts1': { period: DATA.duration(), value: DATA.text(), unit: DATA.text() }}});
        });

        it('cannot add the connector without a webhook', () => {
            return Crud.bad_request(URLs.connector(entity, slug1), [{ webhook: DATA.ERRORS.WEBHOOK }], values, chakram.post);
        });

        it('can add the connector with a webhook', () => {
            return Crud.add(URLs.connector(entity, slug2), { ...values, webhook: DATA.pick(DATA.WEBHOOK.VALID) });
        });

        it('can delete the entity type and all hence its connectors', () => {
            return Crud.delete(URLs.entity(entity));
        });
    });

    // --- connector live / staging tests - for the data imapacts of live / stage there is a whole seperate test suite

    describe('connector live / staging tests', () => {
        let entity = DATA.pick(DATA.SLUG.VALID);
        let connector = DATA.pick(DATA.SLUG.VALID);
        let url = {
            entity: URLs.entity(entity),
            connector: URLs.connector(entity, connector),
            connector_live: URLs.connector_live(entity, connector)
        };

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('can create the entity', () => {
            return Crud.add(url.entity, DATA.some_info(), URLs.entity(entity));
        });

        it('can create the connector', () => {
            return Crud.add(url.connector, DATA.some_info(), url.connector);
        });

        it('the connector is not live', () => {
            return Crud.verify(url.connector, { id: connector, is_live: false });
        });

        it('can make the connector live', () => {
            return Crud.post(url.connector_live);
        });

        it('the connector is now live', () => {
            return Crud.verify(url.connector, { id: connector, is_live: true });
        });

        it('can re-make the connector live', () => {
            return Crud.post(url.connector_live,);
        });

        it('the connector is still live', () => {
            return Crud.verify(url.connector, { id: connector, is_live: true });
        });

        it('can update the connector', () => {
            return Crud.update(url.connector, DATA.some_info());
        });

        it('the connector is still live', () => {
            return Crud.verify(url.connector, { id: connector, is_live: true });
        });

        it('can unmake the connector live', () => {
            return Crud.delete(url.connector_live,);
        });

        it('the connector is now not live', () => {
            return Crud.verify(url.connector, { id: connector, is_live: false });
        });

        it('can re-unmake the connector live', () => {
            return Crud.delete(url.connector_live,);
        });

        it('the connector is still not live', () => {
            return Crud.verify(url.connector, { id: connector, is_live: false });
        });

        it('can update the connector', () => {
            return Crud.update(url.connector, DATA.some_info());
        });

        it('the connector is still not live', () => {
            return Crud.verify(url.connector, { id: connector, is_live: false });
        });

        it('can make the connector live', () => {
            return Crud.post(url.connector_live,);
        });

        it('the connector is now live', () => {
            return Crud.verify(url.connector, { id: connector, is_live: true });
        });

        it('can delete the entity type and all hence its connectors', () => {
            return Crud.delete(url.entity);
        });
    });

    // --- connector validation tests - here we test invalid entries only, on add and update

    describe('connector validation tests', () => {
        let entity = DATA.pick(DATA.SLUG.VALID);
        let slug = DATA.pick(DATA.SLUG.VALID);
        let connector = URLs.connector(entity, slug);
        let values = {
            name: DATA.name(DATA.NAME.REASONABLE),
            description: DATA.text(DATA.DESCRIPTION.REASONABLE),
            webhook: DATA.pick(DATA.WEBHOOK.VALID),
            cache: DATA.integer(DATA.CACHE.REASONABLE),
        };

        function url(cid) { return URLs.connector(entity, cid); }

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('add the housing entity', () => {
            return Crud.add(URLs.entity(entity), DATA.some_info(), URLs.entity(entity));
        });

        it('disallows invalid connector slug', () => {
            let test = Promise.resolve()
            .then(() => Crud.bad_request(url(DATA.slug(DATA.SLUG.SHORTEST - 1)), [{ slug: DATA.ERRORS.MIN }], values, chakram.post))
            .then(() => Crud.bad_request(url(DATA.slug(DATA.SLUG.LONGEST + 1)), [{ slug: DATA.ERRORS.MAX }], values, chakram.post));

            for (let i = 0; i < DATA.SLUG.INVALID.length; i++) {
                test = test.then(() => Crud.bad_request(url(DATA.SLUG.INVALID[i]), [{ slug: DATA.ERRORS.FORMAT }], values, chakram.post))
            }

            return test;
        });

        it('disallows invalid webhook url', () => {
            let test = Promise.resolve()
            for (let i = 0; i < DATA.WEBHOOK.INVALID[0].length; i++) {
              test = test.then(() => Crud.bad_request(connector, [{ webhook: DATA.ERRORS.CONFORM }], { ...values, webhook: DATA.WEBHOOK.INVALID[0][i]}, chakram.post));
            }
            for (let i = 0; i < DATA.WEBHOOK.INVALID[1].length; i++) {
              test = test.then(() => Crud.bad_request(connector, [{ webhook: DATA.ERRORS.FORMAT }], { ...values, webhook: DATA.WEBHOOK.INVALID[1][i]}, chakram.post));
            }
            return test;
        });

        it('disallows invalid cache', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(connector, [{ cache: DATA.ERRORS.BIG }], { ...values, cache: DATA.CACHE.LONGEST + 1 }, chakram.post))
            .then(() => Crud.bad_request(connector, [{ cache: DATA.ERRORS.SMALL }], { ...values, cache: DATA.CACHE.SHORTEST - 1 }, chakram.post))
            .then(() => Crud.bad_request(connector, [{ cache: DATA.ERRORS.SMALL }], { ...values, cache: -1 }, chakram.post))
            .then(() => Crud.bad_request(connector, [{ cache: DATA.ERRORS.TYPE }], { ...values, cache: DATA.text() }, chakram.post))
            .then(() => Crud.bad_request(connector, [{ cache: DATA.ERRORS.TYPE }], { ...values, cache: DATA.integer().toString() }, chakram.post));
        });

        it('disallows invalid description', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(connector, [{ description: DATA.ERRORS.MAX }], { ...values, description: DATA.text(DATA.DESCRIPTION.LONGEST + 1) }, chakram.post))
            .then(() => Crud.bad_request(connector, [{ description: DATA.ERRORS.MIN }], { ...values, description: '' }, chakram.post))
            .then(() => Crud.bad_request(connector, [{ description: DATA.ERRORS.MIN }], { ...values, description: null }, chakram.post));
        });

        it('disallows multiple invalid paramters', () => {
            let errors = [{ description: DATA.ERRORS.MIN, cache: DATA.ERRORS.BIG , webhook: DATA.ERRORS.CONFORM }];
            let delta = { description: '', cache: DATA.CACHE.LONGEST + 1, webhook: DATA.pick(DATA.WEBHOOK.INVALID[0]) };
            return Crud.bad_request(connector, errors, {...values, ...delta}, chakram.post);
        });

        it('create update test entity', () => {
            return Crud.add(connector, values, connector);
        });

        it('disallows update of invalid webhook url', () => {
            let test = Promise.resolve()
            for (let i = 0; i < DATA.WEBHOOK.INVALID[0].length; i++) {
              test = test.then(() => Crud.bad_request(connector, [{ webhook: DATA.ERRORS.CONFORM }], { ...values, webhook: DATA.WEBHOOK.INVALID[0][i]}, chakram.put));
            }
            for (let i = 0; i < DATA.WEBHOOK.INVALID[1].length; i++) {
              test = test.then(() => Crud.bad_request(connector, [{ webhook: DATA.ERRORS.FORMAT }], { ...values, webhook: DATA.WEBHOOK.INVALID[1][i]}, chakram.put));
            }
            return test;
        });

        it('disallows update of invalid cache', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(connector, [{ cache: DATA.ERRORS.BIG }], { ...values, cache: DATA.CACHE.LONGEST + 1 }, chakram.put))
            .then(() => Crud.bad_request(connector, [{ cache: DATA.ERRORS.SMALL }], { ...values, cache: DATA.CACHE.SHORTEST - 1 }, chakram.put))
            .then(() => Crud.bad_request(connector, [{ cache: DATA.ERRORS.SMALL }], { ...values, cache: -1 }, chakram.put))
            .then(() => Crud.bad_request(connector, [{ cache: DATA.ERRORS.TYPE }], { ...values, cache: DATA.text() }, chakram.put))
            .then(() => Crud.bad_request(connector, [{ cache: DATA.ERRORS.TYPE }], { ...values, cache: DATA.integer().toString() }, chakram.put));
        });

        it('disallows update of invalid description', () => {
            return Promise.resolve()
            .then(() => Crud.bad_request(connector, [{ description: DATA.ERRORS.MAX }], { ...values, description: DATA.text(DATA.DESCRIPTION.LONGEST + 1) }, chakram.put))
            .then(() => Crud.bad_request(connector, [{ description: DATA.ERRORS.MIN }], { ...values, description: '' }, chakram.put))
            .then(() => Crud.bad_request(connector, [{ description: DATA.ERRORS.MIN }], { ...values, description: null }, chakram.put));
        });

        it('disallows update of multiple invalid paramters', () => {
            let errors = [{ description: DATA.ERRORS.MIN, cache: DATA.ERRORS.BIG , webhook: DATA.ERRORS.CONFORM }];
            let delta = { description: '', cache: DATA.CACHE.LONGEST + 1, webhook: DATA.pick(DATA.WEBHOOK.INVALID[0]) };
            return Crud.bad_request(connector, errors, {...values, ...delta}, chakram.put);
        });

        it('can delete the entity type and all its connectors', () => {
            return Crud.delete(URLs.entity(entity));
        });
    });
});
