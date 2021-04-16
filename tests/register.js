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

  The register server test harness - use command 'mocha register'

  WARNING: Running this script will reset the entire database!

*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const HTTP = require('http-status-codes');
const DATA = require('./lib/data.js');
const Shared = require('./lib/shared.js');
const Entity = require('./lib/entity.js');
const Connector = require('./lib/connector.js');
const chakram = require('chakram');
const expect = chakram.expect;

// --- the test cases

describe('Register Tests', function() {

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
            return Shared.up(Shared.register);
        });

        it('it responds to an announce request', () => {
            return Shared.announce(Shared.register, process.env.REGISTER_SERVER_NAME, process.env.REGISTER_SERVER_BASE);
        });

        it('it responds to unknown restful resources', () => {
            return Shared.bad_route(Shared.rest('entity', DATA.name()));
        });

        it('the database is empty', () => {
            return Shared.empty();
        });
    });

    // --- register manipulation tests

    describe('register manipulation tests', () => {

        let name1 = DATA.pluck(DATA.NAME.VALID); // pluck - so as to never get duplicate
        let name2 = DATA.pick(DATA.NAME.VALID);
        let values1 = { description: DATA.text(DATA.DESCRIPTION.REASONABLE) };
        let values2 = { description: DATA.text(DATA.DESCRIPTION.REASONABLE + 1) }; // +1 - so as to be different from first

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('the entity is not there to start with', () => {
            return Entity.missing(name1);
        });

        it('can add an entity type', () => {
            return Entity.add(name1, values1);
        });

        it('it is present in the entity type list', () => {
            return Entity.verify_all([{ name: name1, values: values1 }]);
        });

        it('it is present when addressed directly', () => {
            return Entity.verify(name1, values1);
        });

        it('cannot add a duplicate entity type', () => {
            return Entity.duplicate(name1, values1);
        });

        it('can update an entity type', () => {
            return Entity.update(name1, values2);
        });

        it('new values are present in the entity type list', () => {
            return Entity.verify_all([{ name: name1, values: values2 }]);
        });

        it('new values are present when addressed directly', () => {
            return Entity.verify(name1, values2);
        });

        it('the second entity is not there to start with', () => {
            return Entity.missing(name2);
        });

        it('can add a second entity type', () => {
            return Entity.add(name2, values2);
        });

        it('both are present in the entity type list', () => {
            return Entity.verify_all([
                { name: name1, values: values2 },
                { name: name2, values: values2 }
            ]);
        });

        it('can delete the first entity type', () => {
            return Entity.delete(name1);
        });

        it('it is gone from the entity type list', () => {
            return Entity.verify_all([{ name: name2, values: values2 }]);
        });

        it('the entity is gone when addressed directly', () => {
            return Entity.missing(name1);
        });

        it('cannot re-delete the entity type', () => {
            return Entity.action_missing(chakram.delete, name1, values2);
        });

        it('cannot update the entity type', () => {
            return Entity.action_missing(chakram.put, name1, values2);
        });

        it('can delete the second entity type', () => {
            return Entity.delete(name2);
        });
    });

    // --- register validation tests

    describe('register validation tests', () => {

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('disallows various invalid names', () => {
            let tests = [];
            tests.push(Entity.bad(chakram.post, DATA.name(DATA.NAME.SHORTEST - 1), 'name', 'too short'));
            tests.push(Entity.bad(chakram.post, DATA.name(DATA.NAME.LONGEST + 1), 'name', 'too long'));
            for (let i = 0; i < DATA.NAME.INVALID.length; i++) {
                tests.push(Entity.bad(chakram.post, DATA.NAME.INVALID[i], 'name', 'invalid format'));
            }
            return Promise.all(tests);
        });

        it('allows various valid name', () => {
            let tests = [];
            tests.push(Entity.good(chakram.post, DATA.name(DATA.NAME.SHORTEST)));
            tests.push(Entity.good(chakram.post, DATA.name(DATA.NAME.LONGEST)));
            tests.push(Entity.good(chakram.post, DATA.name(DATA.NAME.REASONABLE + 1).toUpperCase()));
            tests.push(Entity.good(chakram.post, DATA.name(DATA.NAME.REASONABLE + 2).concat('    ')));
            return Promise.all(tests);
        });

        it('disallows various invalid descriptions', () => {
            let tests = [];
            tests.push(Entity.bad(chakram.post, DATA.name(DATA.NAME.REASONABLE), 'description', 'too short', {}));
            tests.push(Entity.bad(chakram.post, DATA.name(DATA.NAME.REASONABLE), 'description', 'too short', { description: '' }));
            tests.push(Entity.bad(chakram.post, DATA.name(DATA.NAME.REASONABLE), 'description', 'too short', { description: null }));
            tests.push(Entity.bad(chakram.post, DATA.name(DATA.NAME.REASONABLE), 'description', 'too long', { description: DATA.text(DATA.DESCRIPTION.LONGEST + 1) }));
            return Promise.all(tests);
        });

        it('allows various valid descriptions', () => {
            let tests = [];
            tests.push(Entity.good(chakram.post, DATA.name(DATA.NAME.REASONABLE + 1), { description: DATA.text(DATA.DESCRIPTION.SHORTEST) }));
            tests.push(Entity.good(chakram.post, DATA.name(DATA.NAME.REASONABLE + 2), { description: DATA.text(DATA.DESCRIPTION.LONGEST) }));
            return Promise.all(tests);
        });

        it('disallows update of various invalid descriptions', () => {
            let tests = [];
            tests.push(Entity.bad(chakram.put, DATA.name(DATA.NAME.REASONABLE + 1), 'description', 'too short', {}));
            tests.push(Entity.bad(chakram.put, DATA.name(DATA.NAME.REASONABLE + 1), 'description', 'too short', { description: '' }));
            tests.push(Entity.bad(chakram.put, DATA.name(DATA.NAME.REASONABLE + 1), 'description', 'too short', { description: null }));
            tests.push(Entity.bad(chakram.put, DATA.name(DATA.NAME.REASONABLE + 1), 'description', 'too long', { description: DATA.text(DATA.DESCRIPTION.LONGEST + 1) }));
            return Promise.all(tests);
        });

        /*  TODO: How best to handle the time delay between creation and update in the test?

        it('allows update of various valid descriptions', () => {
            let tests = [];
            tests.push(Entity.good(chakram.put, DATA.name(DATA.NAME.REASONABLE + 1), { description: DATA.text(DATA.DESCRIPTION.SHORTEST) }));
            tests.push(Entity.good(chakram.put, DATA.name(DATA.NAME.REASONABLE + 2), { description: DATA.text(DATA.DESCRIPTION.LONGEST) }));
            return Promise.all(tests);
        });

        */
    });

    // --- connector adding tests

    describe('connector adding tests', () => {

        let entity1 = DATA.pluck(DATA.NAME.VALID); // pluck - so as to never get duplicate
        let entity2 = DATA.pick(DATA.NAME.VALID);
        let connector1 = DATA.pluck(DATA.NAME.VALID); // pluck - so as to never get duplicate
        let connector2 = DATA.pick(DATA.NAME.VALID);
        let values1 = {
            description: DATA.text(DATA.DESCRIPTION.REASONABLE),
            webhook: DATA.pluck(DATA.WEBHOOK.VALID), // pluck - so as to never get duplicate
            cache: DATA.integer(DATA.CACHE.REASONABLE),
        };
        let values2 = {
            description: DATA.text(DATA.DESCRIPTION.REASONABLE + 1), // +1 - so as to be different from first
            webhook: DATA.pick(DATA.WEBHOOK.VALID),
            cache: DATA.integer(DATA.CACHE.REASONABLE),
        };

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('no connectors are returned for a missing parent entity', () => {
            return Connector.missing_parent(entity1);
        });

        it('cannot add a connector to a missing parent entity', () => {
            return Connector.action_missing(chakram.post, entity1, connector1, values1);
        });

        it('cannot update a connector to a missing parent entity', () => {
            return Connector.action_missing(chakram.put, entity1, connector1, values1);
        });

        it('cannot delete a connector to a missing parent entity', () => {
            return Connector.action_missing(chakram.delete, entity1, connector1, values1);
        });

        it('add the housing entity', () => {
            return Entity.add(entity1)
        });

        it('it has no connectors', () => {
            return Connector.verify_all(entity1, []);
        });

        it('add the connector to the entity', () => {
            return Connector.add(entity1, connector1, values1);
        });

        it('it is present in the entities connector list', () => {
            return Connector.verify_all(entity1, [{ name: connector1, values: values1 }]);
        });

        it('it is present when the connector is addressed directly', () => {
            return Connector.verify(entity1, connector1, values1);
        });

        it('cannot add a duplicate connector to the entity', () => {
            return Connector.duplicate(entity1, connector1, values1);
        });

        it('can add a second connector', () => {
            return Connector.add(entity1, connector2, values2);
        });

        it('both are present in the connector list', () => {
            return Connector.verify_all(entity1, [
                { name: connector1, values: values1 },
                { name: connector2, values: values2 }
            ]);
        });

        it('can update a connector', () => {
            return Connector.update(entity1, connector1, values2);
        });

        it('update is present in the connector list', () => {
            return Connector.verify_all(entity1, [
                { name: connector1, values: values2 },
                { name: connector2, values: values2 }
            ]);
        });

        it('update is present when the connector is addressed directly', () => {
            return Connector.verify(entity1, connector1, values2);
        });

        it('can delete the first connector from the entity', () => {
            return Connector.delete(entity1, connector1);
        });

        it('it is no longer present in the entities connector list', () => {
            return Connector.verify_all(entity1, [
                { name: connector2, values: values2 }
            ]);
        });

        it('it is no longer present when the connector is addressed directly', () => {
            return Connector.missing(entity1, connector1);
        });

        it('cannot re-delete the connector from the entity', () => {
            return Connector.delete_missing(entity1, connector1);
        });

        it('can delete the second connector from the entity', () => {
            return Connector.delete(entity1, connector2);
        });

        it('it is gone from the entity type list', () => {
            return Connector.verify_all(entity1, []);
        });

        it('the entity is gone when addressed directly', () => {
            return Connector.missing(entity1, connector2);
        });

        it('can add connector with a missing cache and webhook', () => {
            return Connector.check_defaults(entity1, connector1, { description: 'abc' });
        });

        it('can add connector with an empty webhook', () => {
            return Connector.check_defaults(entity1, connector1, { description: 'abc', webhook: '' });
        });

        it('can add connector with a null cache and webhook', () => {
            return Connector.check_defaults(entity1, connector1, { description: 'abc', webhook: null, cache: null });
        });

        it('can delete the entity type and all hence its connectors', () => {
            return Entity.delete(entity1);
        });
    });

    // --- connector validation tests

    describe('connector validation tests', () => {
        let entity = DATA.pick(DATA.NAME.VALID);
        let connector = DATA.pick(DATA.NAME.VALID);
        let values = {
            description: DATA.text(DATA.DESCRIPTION.REASONABLE),
            webhook: DATA.pick(DATA.WEBHOOK.VALID),
            cache: DATA.integer(DATA.CACHE.REASONABLE),
        };

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('add the housing entity', () => {
            return Entity.add(entity)
        });

        it('disallows invalid connector name', () => {
            let tests = [];
            for (let i = 0; i < DATA.NAME.INVALID.length; i++) {
                tests.push(Connector.bad(entity, DATA.NAME.INVALID[i], values, [{ name: 'invalid format' }]));
            }
            return Promise.all(tests);
        });

        it('disallows invalid webhook url', () => {
            let tests = [];
            for (let i = 0; i < DATA.WEBHOOK.INVALID.length; i++) {
                tests.push(Connector.bad(entity, connector, values, [{ url: 'invalid format' }], { webhook: DATA.WEBHOOK.INVALID[i] }));
            }
            return Promise.all(tests);
        });

        it('disallows invalid cache', () => {
            let tests = [];
            tests.push(Connector.bad(entity, connector, values, [{ cache: 'too large' }], { cache: DATA.CACHE.LONGEST + 1 }));
            tests.push(Connector.bad(entity, connector, values, [{ cache: 'too small' }], { cache: DATA.CACHE.SHORTEST - 1 }));
            tests.push(Connector.bad(entity, connector, values, [{ cache: 'too small' }], { cache: -1 }));
            tests.push(Connector.bad(entity, connector, values, [{ cache: 'not an integer' }], { cache: DATA.text() }));
            tests.push(Connector.bad(entity, connector, values, [{ cache: 'not an integer' }], { cache: DATA.integer().toString() }));
            return Promise.all(tests);
        });

        it('disallows invalid description', () => {
            let tests = [];
            tests.push(Connector.bad(entity, connector, values, [{ description: 'too long' }], { description: DATA.text(DATA.DESCRIPTION.LONGEST + 1) }));
            tests.push(Connector.bad(entity, connector, values, [{ description: 'too short' }], { description: '' }));
            tests.push(Connector.bad(entity, connector, values, [{ description: 'too short' }], { description: null }));
            return Promise.all(tests);
        });

        it('disallows multiple invalid paramters', () => {
            let errors = [{ description: 'too short', cache: 'too large', url: 'invalid format' }];
            let delta = { description: '', cache: DATA.CACHE.LONGEST + 1, webhook: DATA.pick(DATA.WEBHOOK.INVALID) };
            return Connector.bad(entity, connector, values, errors, delta);
        });

        it('can delete the entity type and all its connectors', () => {
            return Entity.delete(entity);
        });
    });
});
