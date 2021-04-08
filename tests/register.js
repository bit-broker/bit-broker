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
const chakram = require('chakram');
const shared = require('./lib/shared.js');
const expect = chakram.expect;

// --- constants

const DATA = require('./lib/data.js');

// --- register class

class Register {

    // --- ensures that the register is empty

    static is_empty() {
        return chakram.get(shared.rest('entity'))
        .then(response => {
            expect(response.body).to.be.an('array');
            expect(response.body.length).to.be.eq(0);
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }
}

// --- entity class

class Entity {

    // --- adds an entity type

    static add(name, details) {
        return chakram.post(shared.rest('entity', name), details)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.CREATED);
            expect(response).to.have.header('Location', shared.rest('entity', name));
            return chakram.wait();
        });
    }

    // --- updates an entity type

    static update(name, details) {
        return chakram.put(shared.rest('entity', name), details)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- attempts to add a duplicate entity type

    static duplicate(name, details) {
        return chakram.post(shared.rest('entity', name), details)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('conflict');
            expect(response).to.have.status(HTTP.CONFLICT);
            return chakram.wait();
        });
    }

    // --- deletes an entity type

    static delete(name) {
        return chakram.delete(shared.rest('entity', name))
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- attempts to action an missing entity type

    static action_missing(action, name, details) {
        return action(shared.rest('entity', name), details)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- checks an entity type is not there

    static missing(name) {
        return chakram.get(shared.rest('entity', name))
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- verifies an entity type

    static verify(name, details) {
        return chakram.get(shared.rest('entity', name))
        .then(response => {
            expect(response.body).to.be.an('object');
            expect(response.body.id).to.be.eq(name);
            expect(response.body.url).to.be.eq(shared.rest('entity', name));
            expect(response.body.description).to.be.eq(details.description);
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- verifies the entire entity type list

    static verify_all(entities) {
        entities.sort((a, b) => a.name.localeCompare(b.name)); // in name order
        return chakram.get(shared.rest('entity'))
        .then(response => {
            expect(response.body).to.be.an('array');
            expect(response.body.length).to.be.eq(entities.length);
            for (let i = 0; i < entities.length; i++) {
                expect(response.body[i]).to.be.an('object');
                expect(response.body[i].id).to.be.eq(entities[i].name);
                expect(response.body[i].url).to.be.eq(shared.rest('entity', entities[i].name));
                expect(response.body[i].description).to.be.eq(entities[i].details.description);
            }
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- adds and then deleted an entity with a good name

    static good(action, name, details = null) {
        return action(shared.rest('entity', name), details || { description: DATA.text(DATA.DESCRIPTION.REASONABLE) })
        .then(response => {
            expect(response).to.have.status(action == chakram.post ? HTTP.CREATED : HTTP.NO_CONTENT);
            return chakram.delete(shared.rest('entity', name.toLowerCase().trim()))
            .then(response => {
                expect(response.body).to.be.undefined;
                expect(response).to.have.status(HTTP.NO_CONTENT);
                return chakram.wait();
            })
        });
    }

    // --- attemps to add an entity with a bad name

    static bad(action, name, type, error, details = null) {
        return action(shared.rest('entity', name), details || { description: DATA.text(DATA.DESCRIPTION.REASONABLE) })
        .then(response => {
            expect(response.body).to.contain(type);
            expect(response.body).to.contain(error);
            expect(response).to.have.status(HTTP.BAD_REQUEST);
            return chakram.get(shared.rest('entity', name))
            .then(response => {
                expect(response.body).to.be.a('string');
                expect(response.body.toLowerCase()).to.contain('not found');
                expect(response).to.have.status(HTTP.NOT_FOUND);
                return chakram.wait();
            })
        });
    }
}

// --- connector class

class Connector {

    // --- adds a connector to an entity type

    static add(entity, connector, details) {
        return chakram.post(shared.rest('entity', entity, 'connector', connector), details)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.CREATED);
            expect(response).to.have.header('Location', shared.rest('entity', entity, 'connector', connector));
            return chakram.wait();
        });
    }

    // --- updates a connector on an entity type

    static update(entity, connector, details) {
        return chakram.put(shared.rest('entity', entity, 'connector', connector), details)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- attempts to add a duplicate connector to an entity type

    static duplicate(entity, connector, details) {
        return chakram.post(shared.rest('entity', entity, 'connector', connector), details)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('conflict');
            expect(response).to.have.status(HTTP.CONFLICT);
            return chakram.wait();
        });
    }

    // --- attempts to add a connector to a missing entity type

    static add_to_missing(entity, connector, details) {
        return chakram.post(shared.rest('entity', entity, 'connector', connector), details)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- deletes a connector from an entity type

    static delete(entity, connector) {
        return chakram.delete(shared.rest('entity', entity, 'connector', connector))
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- attempts to delete a missing connector on an entity type

    static delete_missing(entity, connector) {
        return chakram.delete(shared.rest('entity', entity, 'connector', connector))
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- checks a connector is not present on an entity type

    static missing(entity, connector) {
        return chakram.get(shared.rest('entity', entity, 'connector', connector))
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- checks connectors are not returned for a missing parent entity

    static missing_parent(entity) {
        return chakram.get(shared.rest('entity', entity, 'connector'))
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- attempts an action for a missing parent entity

    static action_missing(action, entity, connector, details) {
        return action(shared.rest('entity', entity, 'connector', connector), details)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- verifies a connector of an entity type

    static verify(entity, connector, details) {
        return chakram.get(shared.rest('entity', entity, 'connector', connector))
        .then(response => {
            expect(response.body).to.be.an('object');
            expect(response.body.id).to.be.eq(connector);
            expect(response.body.url).to.be.eq(shared.rest('entity', entity, 'connector', connector));
            expect(response.body.description).to.be.eq(details.description);
            expect(response.body.entity).to.be.an('object');
            expect(response.body.entity.id).to.be.eq(entity);
            expect(response.body.entity.url).to.be.eq(shared.rest('entity', entity));
            expect(response.body.contribution).to.be.an('object');
            expect(response.body.contribution.id).to.match(new RegExp(DATA.ID.REGEX));
            expect(response.body.contribution.id.length).to.be.eq(DATA.ID.SIZE);
            expect(response.body.contribution.url).to.be.eq(shared.rest('connector', response.body.contribution.id));
            expect(response.body.webhook).to.be.eq(details.webhook);
            expect(response.body.cache).to.be.eq(details.cache);
            expect(response).to.have.status(HTTP.OK);

            return chakram.wait();
        });
    }

    // --- verifies the entire connector list for an entity type

    static verify_all(entity, connectors) {
        connectors.sort((a, b) => a.name.localeCompare(b.name)); // in name order
        return chakram.get(shared.rest('entity', entity, 'connector'))
        .then(response => {
            expect(response.body).to.be.an('array');
            expect(response.body.length).to.be.eq(connectors.length);
            for (let i = 0; i < connectors.length; i++) {
                expect(response.body[i]).to.be.an('object');
                expect(response.body[i].id).to.be.eq(connectors[i].name);
                expect(response.body[i].url).to.be.eq(shared.rest('entity', entity, 'connector', connectors[i].name));
                expect(response.body[i].description).to.be.eq(connectors[i].details.description);
            }
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- adds, checks the defaults and deletes a connector

    static check_defaults(entity, connector, details) {
        return Connector.add(entity, connector, details)
        .then(() => {
            return chakram.get(shared.rest('entity', entity, 'connector', connector))
            .then(response => {
                expect(response.body.webhook).to.be.eq(null);
                expect(response.body.cache).to.be.eq(0);
                expect(response).to.have.status(HTTP.OK);
                return chakram.wait();
            })
            .then(() => {
                return Connector.delete(entity, connector)
            });
        });
    }

    // --- attemps to add a connector with a bad values

    static bad(entity, connector, details, errors, delta = {}) {
        let merged = Object.assign({}, details, Object.assign({}, delta)); // merges without destroying original
        return chakram.post(shared.rest('entity', entity, 'connector', connector), merged)
        .then(response => {
            for (let i = 0; i < errors.length; i++) {
                for (let j in errors[i]) {
                    expect(response.body).to.contain(j);
                    expect(response.body).to.contain(errors[i][j]);
                }
            }
            expect(response).to.have.status(HTTP.BAD_REQUEST);
            return chakram.get(shared.rest('entity', entity, 'connector', connector))
            .then(response => {
                expect(response.body).to.be.a('string');
                expect(response.body.toLowerCase()).to.contain('not found');
                expect(response).to.have.status(HTTP.NOT_FOUND);
                return chakram.wait();
            })
        });
    }
}

// --- the test cases

describe('Register Tests', function() {

    this.timeout(0); // we are not interested in non-functional tests here

    // --- before any tests are run

    before(() => {
        return shared.before_any();
    });

    // --- after all the tests have been run

    after(() => {
        return shared.after_all();
    });

    // --- start up tests

    describe('start up tests', () => {

        it('the server is up', () => {
            return shared.up(shared.register);
        });

        it('it responds to an announce request', () => {
            return shared.announce(shared.register, process.env.REGISTER_SERVER_NAME, process.env.REGISTER_SERVER_BASE);
        });

        it('it responds to unknown restful resources', () => {
            return shared.is_bad_route(shared.rest('entity', DATA.name()));
        });

        it('the register is empty', () => {
            return Register.is_empty();
        });
    });

    // --- basic register manipulation tests

    describe('basic register manipulation tests', () => {

        let name1 = DATA.pluck(DATA.NAME.VALID); // pluck - so as to never get duplicate
        let name2 = DATA.pick(DATA.NAME.VALID);
        let details1 = { description: DATA.text(DATA.DESCRIPTION.REASONABLE) };
        let details2 = { description: DATA.text(DATA.DESCRIPTION.REASONABLE + 1) }; // +1 - so as to be different from first

        before(() => {
            return Register.is_empty();
        });

        after(() => {
            return Register.is_empty();
        });

        it('the entity is not there to start with', () => {
            return Entity.missing(name1);
        });

        it('can add an entity type', () => {
            return Entity.add(name1, details1);
        });

        it('it is present in the entity type list', () => {
            return Entity.verify_all([{ name: name1, details: details1 }]);
        });

        it('it is present when addressed directly', () => {
            return Entity.verify(name1, details1);
        });

        it('cannot add a duplicate entity type', () => {
            return Entity.duplicate(name1, details1);
        });

        it('can update an entity type', () => {
            return Entity.update(name1, details2);
        });

        it('new details are present in the entity type list', () => {
            return Entity.verify_all([{ name: name1, details: details2 }]);
        });

        it('new details are present when addressed directly', () => {
            return Entity.verify(name1, details2);
        });

        it('the second entity is not there to start with', () => {
            return Entity.missing(name2);
        });

        it('can add a second entity type', () => {
            return Entity.add(name2, details2);
        });

        it('both are present in the entity type list', () => {
            return Entity.verify_all([
                { name: name1, details: details2 },
                { name: name2, details: details2 }
            ]);
        });

        it('can delete the first entity type', () => {
            return Entity.delete(name1);
        });

        it('it is gone from the entity type list', () => {
            return Entity.verify_all([{ name: name2, details: details2 }]);
        });

        it('the entity is gone when addressed directly', () => {
            return Entity.missing(name1);
        });

        it('cannot re-delete the entity type', () => {
            return Entity.action_missing(chakram.delete, name1, details2);
        });

        it('cannot update the entity type', () => {
            return Entity.action_missing(chakram.put, name1, details2);
        });

        it('can delete the second entity type', () => {
            return Entity.delete(name2);
        });
    });

    // --- register validation tests

    describe('register validation tests', () => {

        before(() => {
            return Register.is_empty();
        });

        after(() => {
            return Register.is_empty();
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
        }); */
    });

    // --- basic connector adding tests

    describe('basic connector adding tests', () => {

        let entity1 = DATA.pluck(DATA.NAME.VALID); // pluck - so as to never get duplicate
        let entity2 = DATA.pick(DATA.NAME.VALID);
        let connector1 = DATA.pluck(DATA.NAME.VALID); // pluck - so as to never get duplicate
        let connector2 = DATA.pick(DATA.NAME.VALID);
        let details1 = {
            description: DATA.text(DATA.DESCRIPTION.REASONABLE),
            webhook: DATA.pluck(DATA.WEBHOOK.VALID), // pluck - so as to never get duplicate
            cache: DATA.integer(DATA.CACHE.REASONABLE),
        };
        let details2 = {
            description: DATA.text(DATA.DESCRIPTION.REASONABLE + 1), // +1 - so as to be different from first
            webhook: DATA.pick(DATA.WEBHOOK.VALID),
            cache: DATA.integer(DATA.CACHE.REASONABLE),
        };

        before(() => {
            return Register.is_empty();
        });

        after(() => {
            return Register.is_empty();
        });

        it('no connectors are returned for a missing parent entity', () => {
            return Connector.missing_parent(entity1);
        });

        it('cannot add a connector to a missing parent entity', () => {
            return Connector.action_missing(chakram.post, entity1, connector1, details1);
        });

        it('cannot update a connector to a missing parent entity', () => {
            return Connector.action_missing(chakram.put, entity1, connector1, details1);
        });

        it('cannot delete a connector to a missing parent entity', () => {
            return Connector.action_missing(chakram.delete, entity1, connector1, details1);
        });

        it('add the housing entity', () => {
            return Entity.add(entity1, { description: DATA.text(DATA.DESCRIPTION.REASONABLE) })
        });

        it('it has no connectors', () => {
            return Connector.verify_all(entity1, []);
        });

        it('add the connector to the entity', () => {
            return Connector.add(entity1, connector1, details1);
        });

        it('it is present in the entities connector list', () => {
            return Connector.verify_all(entity1, [{ name: connector1, details: details1 }]);
        });

        it('it is present when the connector is addressed directly', () => {
            return Connector.verify(entity1, connector1, details1);
        });

        it('cannot add a duplicate connector to the entity', () => {
            return Connector.duplicate(entity1, connector1, details1);
        });

        it('can add a second connector', () => {
            return Connector.add(entity1, connector2, details2);
        });

        it('both are present in the connector list', () => {
            return Connector.verify_all(entity1, [
                { name: connector1, details: details1 },
                { name: connector2, details: details2 }
            ]);
        });

        it('can update a connector', () => {
            return Connector.update(entity1, connector1, details2);
        });

        it('update is present in the connector list', () => {
            return Connector.verify_all(entity1, [
                { name: connector1, details: details2 },
                { name: connector2, details: details2 }
            ]);
        });

        it('update is present when the connector is addressed directly', () => {
            return Connector.verify(entity1, connector1, details2);
        });

        it('can delete the first connector from the entity', () => {
            return Connector.delete(entity1, connector1);
        });

        it('it is no longer present in the entities connector list', () => {
            return Connector.verify_all(entity1, [
                { name: connector2, details: details2 }
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
        let details = {
            description: DATA.text(DATA.DESCRIPTION.REASONABLE),
            webhook: DATA.pick(DATA.WEBHOOK.VALID),
            cache: DATA.integer(DATA.CACHE.REASONABLE),
        };

        before(() => {
            return Register.is_empty();
        });

        after(() => {
            return Register.is_empty();
        });

        it('add the housing entity', () => {
            return Entity.add(entity, { description: DATA.text(DATA.DESCRIPTION.REASONABLE) })
        });

        it('disallows invalid connector name', () => {
            let tests = [];
            for (let i = 0; i < DATA.NAME.INVALID.length; i++) {
                tests.push(Connector.bad(entity, DATA.NAME.INVALID[i], details, [{ name: 'invalid format' }]));
            }
            return Promise.all(tests);
        });

        it('disallows invalid webhook url', () => {
            let tests = [];
            for (let i = 0; i < DATA.WEBHOOK.INVALID.length; i++) {
                tests.push(Connector.bad(entity, connector, details, [{ url: 'invalid format' }], { webhook: DATA.WEBHOOK.INVALID[i] }));
            }
            return Promise.all(tests);
        });

        it('disallows invalid cache', () => {
            let tests = [];
            tests.push(Connector.bad(entity, connector, details, [{ cache: 'too large' }], { cache: DATA.CACHE.LONGEST + 1 }));
            tests.push(Connector.bad(entity, connector, details, [{ cache: 'too small' }], { cache: DATA.CACHE.SHORTEST - 1 }));
            tests.push(Connector.bad(entity, connector, details, [{ cache: 'too small' }], { cache: -1 }));
            tests.push(Connector.bad(entity, connector, details, [{ cache: 'not an integer' }], { cache: DATA.text() }));
            tests.push(Connector.bad(entity, connector, details, [{ cache: 'not an integer' }], { cache: DATA.integer().toString() }));
            return Promise.all(tests);
        });

        it('disallows invalid description', () => {
            let tests = [];
            tests.push(Connector.bad(entity, connector, details, [{ description: 'too long' }], { description: DATA.text(DATA.DESCRIPTION.LONGEST + 1) }));
            tests.push(Connector.bad(entity, connector, details, [{ description: 'too short' }], { description: '' }));
            tests.push(Connector.bad(entity, connector, details, [{ description: 'too short' }], { description: null }));
            return Promise.all(tests);
        });

        it('disallows multiple invalid paramters', () => {
            let errors = [{ description: 'too short', cache: 'too large', url: 'invalid format' }];
            let delta = { description: '', cache: DATA.CACHE.LONGEST + 1, webhook: DATA.pick(DATA.WEBHOOK.INVALID) };
            return Connector.bad(entity, connector, details, errors, delta);
        });

        it('can delete the entity type and all its connectors', () => {
            return Entity.delete(entity);
        });
    });

    // --- TODO: complete these tests - connector modification tests
    /*
        describe('connector modification tests', () => {
            let entity = DATA.pick(DATA.NAME.VALID);
            let connector = DATA.pick(DATA.NAME.VALID);
            let details = {
                description: DATA.text(DATA.DESCRIPTION.REASONABLE),
                webhook: DATA.pick(DATA.WEBHOOK.VALID),
                cache: DATA.integer(DATA.CACHE.REASONABLE),
            };

            function modify_connector(settings) {
                let modified = Object.assign(Object.assign({}, details), settings);
                return chakram.put(shared.rest('entity', entity, 'connector', connector), modified)
                .then(response => {
                    expect(response).to.have.status(204);
                    return chakram.get(shared.rest('entity', entity, 'connector', connector))
                    .then(response => {
                        expect(response).to.have.status(200);
                        expect(response.body.description).to.be.eq(modified.description);
                        expect(response.body.webhook).to.be.eq(modified.webhook);
                        expect(response.body.cache).to.be.eq(modified.cache);
                    //    expect(response.body.live).to.be.eq(false); // this should never be affected
                        return chakram.wait();
                    });
                });
            }

            function modify_tests(tests) { // in a sequence, as it's the same connector each time
                let test = Promise.resolve();

                for (let i = 0; i < tests.length; i++) {
                    test = test.then(() => {
                        return modify_connector(tests[i]);
                    });
                }

                return test;
            }

            before(() => {
                return Register.is_empty();
            });

            after(() => {
                return Register.is_empty();
            });

            it('add the housing entity', () => {
                return Entity.add(entity, { description: DATA.text(DATA.DESCRIPTION.REASONABLE) })
            });

            it('cannot modify a connector that is not there', () => {
                return chakram.put(shared.rest('entity', entity, 'connector', connector), details)
                .then(response => {
                    expect(response).to.have.status(404);
                    return chakram.wait();
                });
            });

            it('add the housing connector', () => {
                return chakram.post(shared.rest('entity', entity, 'connector', connector), details)
                .then(response => {
                    expect(response).to.have.status(201);
                    expect(response).to.have.header('Location', shared.rest('entity', entity, 'connector', connector));
                    return chakram.wait();
                });
            });

            it('can modify the connector without changing details', () => {
                return modify_connector({});
            });

            it('can modify the connector cache value', () => {
                return modify_tests([
                    { cache: DATA.CACHE.LONGEST },
                    { cache: DATA.CACHE.SHORTEST },
                    { cache: DATA.CACHE.REASONABLE },
                    { cache: null },
                    { cache: DATA.CACHE.REASONABLE },
                ]);
            });

            it('can modify the connector webhook value', () => {
                let tests = [];

                for (let i = 0; i < DATA.WEBHOOK.VALID.length; i++) {
                    tests.push({ webhook: DATA.WEBHOOK.VALID[i] });
                }

                return modify_tests(tests);
            });

            it('can modify the connector description value', () => {
                return modify_tests([
                    { description: DATA.text() },
                    { description: DATA.text(1) },
                    { description: DATA.text(10) },
                    { description: '' },
                ]);
            });

            it('can modify multiple connector values in same call', () => {
                return modify_tests([{
                    cache: DATA.integer(DATA.CACHE.REASONABLE),
                    webhook: DATA.pick(DATA.WEBHOOK.VALID),
                    description: DATA.text(DATA.integer())
                }]);
            });

            it('can delete the entity type and all its connectors', () => {
                return Entity.delete(entity);
            });
        });*/
});
