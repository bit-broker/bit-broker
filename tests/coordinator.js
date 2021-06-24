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

  The coordinator test harness - use command 'mocha coordinator'

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
            return Shared.up(process.env.COORDINATOR_BASE);
        });

        it('it responds to an announce request', () => {
            return Shared.announce(process.env.COORDINATOR_BASE, process.env.COORDINATOR_NAME);
        });

        it('the database is empty', () => {
            return Shared.empty();
        });
    });

    // --- entity manipulation tests

    describe('entity manipulation tests', () => {
        let slug1 = DATA.pluck(DATA.SLUG.VALID); // pluck - so as to never get duplicate
        let slug2 = DATA.pick(DATA.SLUG.VALID);
        let entity1 = Shared.urls.entity(slug1);
        let entity2 = Shared.urls.entity(slug2);
        let values1 = { name: DATA.name(), description: DATA.text(DATA.DESCRIPTION.REASONABLE) };
        let values2 = { name: DATA.name(), description: DATA.text(DATA.DESCRIPTION.REASONABLE + 1) }; // +1 - so as to be different from first
        let all = Shared.urls.entity();

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
            return Crud.add(entity1, values1);
        });

        it('it is present in the entity type list', () => {
            return Crud.verify_all(all, [ { id: slug1, url: entity1, ...values1 } ]);
        });

        it('it is present when addressed directly', () => {
            return Crud.verify(entity1, { id: slug1, url: entity1, ...values1 });
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

        it('the second entity is not there to start with', () => {
            return Crud.not_found(entity2);
        });

        it('can add a second entity type', () => {
            return Crud.add(entity2, values2);
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

    // --- entity validation tests - here we test valid and invalid, on add and update

    describe('entity validation tests', () => {
        let entity = Shared.urls.entity(DATA.pick(DATA.SLUG.VALID));
        let values = DATA.some_info();

        function some_name() { return Shared.urls.entity(DATA.slug(DATA.SLUG.REASONABLE)); } // some reasonable name

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('allows various valid slug', () => {
            return Promise.resolve()
            .then(() => Crud.add_del(Shared.urls.entity(DATA.slug(DATA.SLUG.SHORTEST)), values))
            .then(() => Crud.add_del(Shared.urls.entity(DATA.slug(DATA.SLUG.LONGEST)), values))
            .then(() => Crud.add_del(Shared.urls.entity(DATA.slug(DATA.SLUG.REASONABLE).toUpperCase()), values))
            .then(() => Crud.add_del(Shared.urls.entity(DATA.slug(DATA.SLUG.REASONABLE).concat('   ')), values));
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

        it('allows add with trailing slash', () => {
            let slashed = entity + '/';
            return Crud.add(slashed, values, entity)
            .then (() => Crud.verify(slashed, values))
            .then (() => Crud.delete(slashed));
        });

        it('disallows various invalid slugs', () => {
            let test = Promise.resolve()
            .then(() => Crud.bad_request(Shared.urls.entity(DATA.slug(DATA.SLUG.SHORTEST - 1)), [{ slug: DATA.ERRORS.MIN }], values, chakram.post))
            .then(() => Crud.bad_request(Shared.urls.entity(DATA.slug(DATA.SLUG.LONGEST + 1)), [{ slug: DATA.ERRORS.MAX }], values, chakram.post));

            for (let i = 0; i < DATA.SLUG.INVALID.length; i++) {
                test = test.then(() => Crud.bad_request(Shared.urls.entity(DATA.SLUG.INVALID[i]), [{ slug: DATA.ERRORS.FORMAT }], values, chakram.post));
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

        it('create update test entity', () => {
            return Crud.add(entity, values);
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

        it('delete update test entity', () => {
            return Crud.delete(entity);
        });
    });

    // --- connector manipulation tests

    describe('connector manipulation tests', () => {
        let entity = DATA.pluck(DATA.SLUG.VALID); // pluck - so as to never get duplicate
        let slug1 = DATA.pluck(DATA.SLUG.VALID); // pluck - so as to never get duplicate
        let slug2 = DATA.pick(DATA.SLUG.VALID);
        let connector1 = Shared.urls.connector(entity, slug1);
        let connector2 = Shared.urls.connector(entity, slug2);
        let all = Shared.urls.connector(entity);
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
            return Crud.not_found(Shared.urls.entity(entity));
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
            return Crud.add(Shared.urls.entity(entity), base);
        });

        it('it has no connectors', () => {
            return Crud.verify_all(all, []);
        });

        it('add the connector to the entity', () => {
            return Crud.add(connector1, values1, connector1, (body) => {
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
            });
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
            return Crud.add(connector2, values2, connector2, (body) => {
                expect(body).to.match(new RegExp(DATA.KEY.REGEX));
            });
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
            return Crud.delete(Shared.urls.entity(entity));
        });
    });

    // --- connector validation tests - here we test invalid entries only, on add and update

    describe('connector validation tests', () => {
        let entity = DATA.pick(DATA.SLUG.VALID);
        let slug = DATA.pick(DATA.SLUG.VALID);
        let connector = Shared.urls.connector(entity, slug);
        let values = {
            name: DATA.name(DATA.NAME.REASONABLE),
            description: DATA.text(DATA.DESCRIPTION.REASONABLE),
            webhook: DATA.pick(DATA.WEBHOOK.VALID),
            cache: DATA.integer(DATA.CACHE.REASONABLE),
        };

        function url(cid) { return Shared.urls.connector(entity, cid); }

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('add the housing entity', () => {
            return Crud.add(Shared.urls.entity(entity), DATA.some_info());
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
            let errors = [{ description: DATA.ERRORS.MIN, cache: DATA.ERRORS.MIN , webhook: DATA.ERRORS.CONFORM }];
            let delta = { description: '', cache: DATA.CACHE.LONGEST + 1, webhook: DATA.pick(DATA.WEBHOOK.INVALID[0]) };
            return Crud.bad_request(connector, errors, {...values, ...delta}, chakram.post);
        });

        it('create update test entity', () => {
            return Crud.add(connector, values);
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
            let errors = [{ description: DATA.ERRORS.MIN, cache: DATA.ERRORS.MIN , webhook: DATA.ERRORS.CONFORM }];
            let delta = { description: '', cache: DATA.CACHE.LONGEST + 1, webhook: DATA.pick(DATA.WEBHOOK.INVALID[0]) };
            return Crud.bad_request(connector, errors, {...values, ...delta}, chakram.put);
        });

        it('can delete the entity type and all its connectors', () => {
            return Crud.delete(Shared.urls.entity(entity));
        });
    });
});
