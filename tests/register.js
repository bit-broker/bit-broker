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
            expect(response).to.have.status(HTTP.OK);
            expect(response.body).to.be.an('array');
            expect(response.body.length).to.be.eq(0);
            return chakram.wait();
        });
    }
}

// --- entity class

class Entity {

    // --- adds an entity type

    static add (name, details) {
        return chakram.post(shared.rest('entity', name), details)
        .then(response => {
            expect(response).to.have.status(HTTP.CREATED);
            expect(response).to.have.header('Location', shared.rest('entity', name));
            expect(response.body).to.be.undefined;
            return chakram.wait();
        });
    }

    // --- updates an entity type

    static update (name, details) {
        return chakram.put(shared.rest('entity', name), details)
        .then(response => {
            expect(response).to.have.status(HTTP.NO_CONTENT);
            expect(response.body).to.be.undefined;
            return chakram.wait();
        });
    }

    // --- attempts to add a duplicate entity type

    static duplicate (name, details) {
        return chakram.post(shared.rest('entity', name), details)
        .then(response => {
            expect(response).to.have.status(HTTP.CONFLICT);
            expect(response.body).to.be.undefined;
            return chakram.wait();
        });
    }

    // --- deletes an entity type

    static delete (name) {
        return chakram.delete(shared.rest('entity', name))
        .then(response => {
            expect(response).to.have.status(HTTP.NO_CONTENT);
            expect(response.body).to.be.undefined;
            return chakram.wait();
        });
    }

    // --- attempts to deletes an missing entity type

    static delete_missing (name) {
        return chakram.delete(shared.rest('entity', name))
        .then(response => {
            expect(response).to.have.status(HTTP.NOT_FOUND);
            expect(response.body).to.be.undefined;
            return chakram.wait();
        });
    }

    // --- checks an entity type is not there

    static missing (name) {
        return chakram.get(shared.rest('entity', name))
        .then(response => {
            expect(response).to.have.status(HTTP.NOT_FOUND);
            expect(response.body).to.be.undefined;
            return chakram.wait();
        });
    }

    // --- verifies an entity type

    static verify (name, details) {
        return chakram.get(shared.rest('entity', name))
        .then(response => {
            expect(response).to.have.status(HTTP.OK);
            expect(response.body).to.be.an('object');
            expect(response.body.id).to.be.eq(name);
            expect(response.body.url).to.be.eq(shared.rest('entity', name));
            expect(response.body.description).to.be.eq(details.description);
            return chakram.wait();
        });
    }

    // --- verifies the entire entity type list

    static verify_all (entities) {
        entities.sort((a, b) => a.name.localeCompare(b.name));
        return chakram.get(shared.rest('entity'))
        .then(response => {
            expect(response).to.have.status(HTTP.OK);
            expect(response.body).to.be.an('array');
            expect(response.body.length).to.be.eq(entities.length);
            for (let i = 0 ; i < entities.length ; i++) {
                expect(response.body[i]).to.be.an('object');
                expect(response.body[i].id).to.be.eq(entities[i].name);
                expect(response.body[i].url).to.be.eq(shared.rest('entity', entities[i].name));
                expect(response.body[i].description).to.be.eq(entities[i].details.description);
            }
            return chakram.wait();
        });
    }

    // --- adds and then deleted an entity with a good name

    static good(name, details = null) {
        return chakram.post(shared.rest('entity', name), details || { description: DATA.text(DATA.DESCRIPTION.REASONABLE) })
        .then(response => {
            expect(response).to.have.status(HTTP.CREATED);
            return chakram.delete(shared.rest('entity', name.toLowerCase().trim()))
            .then(response => {
                expect(response).to.have.status(HTTP.NO_CONTENT);
                expect(response.body).to.be.undefined;
                return chakram.wait();
            })
        });
    }

    // --- attemps to add an entity with a bad name

    static bad(name, type, error, details = null) {
        return chakram.post(shared.rest('entity', name), details || { description: DATA.text(DATA.DESCRIPTION.REASONABLE) })
        .then(response => {
            expect(response).to.have.status(HTTP.BAD_REQUEST);
            expect(response.body).to.contain(type);
            expect(response.body).to.contain(error);
            return chakram.get(shared.rest('entity', name))
            .then(response => {
                expect(response).to.have.status(HTTP.NOT_FOUND);
                expect(response.body).to.be.undefined;
                return chakram.wait();
            })
        });
    }
}

// --- connector class

class Connector
{
    // --- adds a connector to an entity type

    static add(entity, connector, details) {
        return chakram.post(shared.rest('entity', entity, 'connector', connector), details)
        .then(response => {
            expect(response).to.have.status(HTTP.CREATED);
            expect(response).to.have.header('Location', shared.rest('entity', entity, 'connector', connector));
            expect(response.body).to.be.undefined;
            return chakram.wait();
        });
    }

    // --- attempts to add a duplicate connector to an entity type

    static duplicate(entity, connector, details) {
        return chakram.post(shared.rest('entity', entity, 'connector', connector), details)
        .then(response => {
            expect(response).to.have.status(HTTP.CONFLICT);
            expect(response.body).to.be.undefined;
            return chakram.wait();
        });
    }

    // --- attempts to add a connector to a missing entity type

    static add_to_missing(entity, connector, details) {
        return chakram.post(shared.rest('entity', entity, 'connector', connector), details)
        .then(response => {
            expect(response).to.have.status(HTTP.NOT_FOUND);
            expect(response.body).to.be.undefined;
            return chakram.wait();
        });
    }

    // --- deletes a connector from an entity type

    static delete(entity, connector) {
        return chakram.delete(shared.rest('entity', entity, 'connector', connector))
        .then(response => {
            expect(response).to.have.status(HTTP.NO_CONTENT);
            expect(response.body).to.be.undefined;
            return chakram.wait();
        });
    }

    // --- attempts to delete a missing connector on an entity type

    static delete_missing(entity, connector) {
        return chakram.delete(shared.rest('entity', entity, 'connector', connector))
        .then(response => {
            expect(response).to.have.status(HTTP.NOT_FOUND);
            expect(response.body).to.be.undefined;
            return chakram.wait();
        });
    }

    // --- checks a connector is not present on an entity type

    static missing(entity, connector) {
        return chakram.get(shared.rest('entity', entity, 'connector', connector))
        .then(response => {
            expect(response).to.have.status(HTTP.NOT_FOUND);
            expect(response.body).to.be.undefined;
            return chakram.wait();
        });
    }

    // --- verifies a connector of an entity type

    static verify (entity, connector, details) {
        return chakram.get(shared.rest('entity', entity, 'connector', connector))
        .then(response => {
            expect(response).to.have.status(HTTP.OK);
            expect(response.body).to.be.an('object');
            expect(response.body.id).to.be.eq(connector);
            expect(response.body.url).to.be.eq(shared.rest('entity', entity, 'connector', connector));
            expect(response.body.description).to.be.eq(details.description);
            expect(response.body.entity).to.be.an('object');
            expect(response.body.entity.id).to.be.eq(entity);
            expect(response.body.entity.url).to.be.eq(shared.rest('entity', entity));
            expect(response.body.contribution).to.be.an('object');
          // TODO  expect(response.body.contribution.id).to.be.eq(entity1);
          // TODO  expect(response.body.contribution.url).to.be.eq(shared.rest('entity', entity1));
            expect(response.body.webhook).to.be.eq(details.webhook);
            expect(response.body.cache).to.be.eq(details.cache);

            return chakram.wait();
        });
    }

    // --- verifies the entire connector list for an entity type

    static verify_all (entity, connectors) {
        connectors.sort((a, b) => a.name.localeCompare(b.name));
        return chakram.get(shared.rest('entity', entity, 'connector'))
        .then(response => {
            expect(response).to.have.status(HTTP.OK);
            expect(response.body).to.be.an('array');
            expect(response.body.length).to.be.eq(connectors.length);
            for (let i = 0 ; i < connectors.length ; i++) {
                expect(response.body[i]).to.be.an('object');
                expect(response.body[i].id).to.be.eq(connectors[i].name);
                expect(response.body[i].url).to.be.eq(shared.rest('entity', entity, 'connector', connectors[i].name));
                expect(response.body[i].description).to.be.eq(connectors[i].details.description);
            }
            return chakram.wait();
        });
    }

    // --- adds, checks the defaults and deletes a connector

    static check_defaults(entity, connector, details) {
        return Connector.add(entity, connector, details)
        .then(() => {
            return chakram.get(shared.rest('entity', entity, 'connector', connector))
            .then(response => {
                expect(response).to.have.status(HTTP.OK);
                expect(response.body.webhook).to.be.eq(null);
                expect(response.body.cache).to.be.eq(0);
                return chakram.wait();
            })
            .then(() => {
                return Connector.delete(entity, connector)
            });
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
            return Entity.verify_all ([{ name: name1,  details: details2 }]);
        });

        it('new details are present when addressed directly', () => {
            return Entity.verify (name1, details2);
        });

        it('can add a second entity type', () => {
            return Entity.add(name2, details2);
        });

        it('both are present in the entity type list', () => {
            return Entity.verify_all ([
              { name: name1, details: details2 },
              { name: name2, details: details2 }
            ]);
        });

        it('can delete the first entity type', () => {
            return Entity.delete(name1);
        });

        it('it is gone from the entity type list', () => {
            return Entity.verify_all ([{ name: name2, details: details2 }]);
        });

        it('the entity is gone when addressed directly', () => {
            return Entity.missing(name1);
        });

        it('cannot re-delete the entity type', () => {
            return Entity.delete_missing (name1);
        });

        it('can delete the second entity type', () => {
            return Entity.delete(name2);
        });

        it('the register is now empty', () => {
            return Register.is_empty();
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

        it('disallows short names', () => {
            return Entity.bad(DATA.name(DATA.NAME.SHORTEST - 1), 'name', 'too short');
        });

        it('disallows long names', () => {
            return Entity.bad(DATA.name(DATA.NAME.LONGEST + 1), 'name', 'too long');
        });

        it('disallows various invalid names', () => {
            let tests = [];
            for (let i = 0; i < DATA.NAME.INVALID.length; i++) {
                tests.push(Entity.bad(DATA.NAME.INVALID[i], 'name', 'invalid format'));
            }
            return Promise.all(tests);
        });

        it('allows shortest name', () => {
            return Entity.good(DATA.name(DATA.NAME.SHORTEST));
        });

        it('allows longest name', () => {
            return Entity.good(DATA.name(DATA.NAME.LONGEST));
        });

        it('handles names case independantly', () => {
            return Entity.good(DATA.name(DATA.NAME.REASONABLE).toUpperCase());
        });

        it('handles names trimmed of spaces', () => {
            return Entity.good( DATA.name(DATA.NAME.REASONABLE).concat('    '));
        });

        it('disallows a missing description', () => {
            return Entity.bad(DATA.name(DATA.NAME.REASONABLE), 'description', 'too short', {});
        });

        it('disallows an empty description', () => {
            return Entity.bad(DATA.name(DATA.NAME.REASONABLE), 'description', 'too short', { description: '' });
        });

        it('disallows a long description', () => {
            return Entity.bad(DATA.name(DATA.NAME.REASONABLE), 'description', 'too long', { description: DATA.text(DATA.DESCRIPTION.LONGEST + 1) });
        });

        it('allows shortest description', () => {
            return Entity.good(DATA.name(DATA.NAME.REASONABLE), { description: DATA.text(DATA.DESCRIPTION.SHORTEST) });
        });

        it('allows longest description', () => {
            return Entity.good(DATA.name(DATA.NAME.REASONABLE), { description: DATA.text(DATA.DESCRIPTION.LONGEST) });
        });
    });

    // --- basic connector adding tests

    describe('basic connector adding tests', () => {

        let entity1 = DATA.pluck(DATA.NAME.VALID); // pluck - so as to never get duplicate
        let entity2 = DATA.pick(DATA.NAME.VALID);
        let connector1 = DATA.pluck(DATA.NAME.VALID); // pluck - so as to never get duplicate
        let connector2 = DATA.pick(DATA.NAME.VALID); // pluck - so as to never get duplicate
        let details1 = {
            description: DATA.text(DATA.DESCRIPTION.REASONABLE),
            webhook: DATA.pick(DATA.WEBHOOK.VALID),
            cache: DATA.integer(DATA.CACHE.REASONABLE),
        };
        let details2 = {
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

        it("can't add a duplicate connector to the entity", () => {
            return Connector.duplicate(entity1, connector1, details1);
        });

        it("can't add a connector to a missing entity", () => {
            return Connector.add_to_missing(entity2, connector1, details1);
        });

        it('can add a second connector', () => {
            return Connector.add(entity1, connector2, details2);
        });

        it('both are present in the connector list', () => {
            return Connector.verify_all (entity1, [
              { name: connector1, details: details1 },
              { name: connector2, details: details2 }
            ]);
        });

        it('can delete the first connector from the entity', () => {
            return Connector.delete(entity1, connector1);
        });

        it('it is no longer present in the entities connector list', () => {
            return Connector.verify_all (entity1, [
              { name: connector2, details: details2 }
            ]);
        });

        it('it is no longer present when the connector is addressed directly', () => {
            return Connector.missing(entity1, connector1);
        });

        it("can't re-delete the connector from the entity", () => {
            return Connector.delete_missing(entity1, connector1);
        });

        it('can delete the second connector from the entity', () => {
            return Connector.delete(entity1, connector2);
        });

        it('it is gone from the entity type list', () => {
            return Connector.verify_all (entity1, []);
        });

        it('the entity is gone when addressed directly', () => {
            return Connector.missing(entity1, connector2);
        });

        it('can add connector with a missing cache and webhook', () => {
            return Connector.check_defaults(entity1, connector1, { description: "abc" });
        });

        it('can add connector with an empty webhook', () => {
            return Connector.check_defaults(entity1, connector1, { description: "abc", webhook: '' });
        });

        it('can add connector with a null cache and webhook', () => {
            return Connector.check_defaults(entity1, connector1, { description: "abc", webhook: null, cache: null });
        });

        it('can delete the entity type and all hence its connectors', () => {
            return Entity.delete(entity1);
        });
    });

/*
    // --- connector validation tests

    describe('connector validation tests', () => {
        let entity = DATA.pick(DATA.NAME.VALID);
        let connector = DATA.pick(DATA.NAME.VALID);
        let details = {
            description: DATA.text(DATA.DESCRIPTION.REASONABLE),
            webhook: DATA.pick(DATA.WEBHOOK.VALID),
            cache: DATA.integer(DATA.CACHE.REASONABLE),
        };

        function bad_connector(name, modified, errors) {
            let merged = Object.assign({}, details, Object.assign({}, modified)); // merges without destroying original
            return chakram.post(shared.rest('entity', entity, 'connector', name), merged)
            .then(response => {
                expect(response).to.have.status(HTTP.BAD_REQUEST);
                for (let i = 0; i < errors.length; i++) {
                    expect(response.body).to.contain(errors[i]);
                }
                return chakram.get(shared.rest('entity', entity, 'connector', name))
                .then(response => {
                    expect(response).to.have.status(HTTP.NOT_FOUND);
                    return chakram.wait();
                })
            });
        }

        before(() => {
            return Register.is_empty();
        });

        after(() => {
            return Register.is_empty();
        });

        it('add the housing entity', () => {
            return chakram.post(shared.rest('entity', entity), { description: "abc" })
            .then(response => {
                expect(response).to.have.status(HTTP.CREATED);
                return chakram.wait();
            });
        });

        it('disallows invalid connector name', () => {
            let tests = [];
            for (let i = 0; i < DATA.NAME.INVALID.length; i++) {
                tests.push(bad_connector(DATA.NAME.INVALID[i], {}, ['invalid format']));
            }
            return Promise.all(tests);
        });

        it('disallows invalid webhook url', () => {
            let tests = [];
            for (let i = 0; i < DATA.WEBHOOK.INVALID.length; i++) {
                tests.push(bad_connector(connector, { webhook: DATA.WEBHOOK.INVALID[i] }, ['invalid format']));
            }
            return Promise.all(tests);
        });

        it('disallows invalid cache', () => {
            let tests = [];
            tests.push(bad_connector(connector, { cache: DATA.CACHE.LONGEST + 1 }, ['too larsge']));
            tests.push(bad_connector(connector, { cache: DATA.CACHE.SHORTEST - 1 }, ['too small']));
            tests.push(bad_connector(connector, { cache: -1 }, ['too small']));
            tests.push(bad_connector(connector, { cache: DATA.text() }, ['not an integer'])); // not a number
            tests.push(bad_connector(connector, { cache: DATA.integer().toString() }, ['not an integer'])); // number as a string
            return Promise.all(tests);
        });

        it('disallows invalid description', () => {
            // there is no description validation really
        });

        it('disallows multiple invalid paramters', () => {
            return bad_connector(connector, { cache: DATA.CACHE.LONGEST + 1, webhook: DATA.oneof(DATA.WEBHOOKS.INVALID) }, ['invalid cache', 'invalid webhook']);
        });

        it('can delete the entity type and all its connectors', () => {
            return chakram.delete(shared.rest('register', entity))
            .then(response => {
                expect(response).to.have.status(200);
                return chakram.wait();
            });
        });
    });

    // --- connector modification tests

    describe('connector modification tests', () => {
        let entity = DATA.oneof(DATA.NAMES.VALID);
        let connector = DATA.oneof(DATA.NAMES.VALID);
        let details = {
            description: DATA.words(),
            webhook: DATA.oneof(DATA.WEBHOOKS.VALID),
            cache: DATA.integer(DATA.CACHE.REASONABLE),
        };

        function modify_connector(settings) {
            let modified = Object.assign(Object.assign({}, details), settings);
            return chakram.put(shared.rest('register', entity, 'connector', connector), modified)
            .then(response => {
                expect(response).to.have.status(200);
                return chakram.get(shared.rest('register', entity, 'connector', connector))
                .then(response => {
                    expect(response).to.have.status(200);
                    expect(response.body.description).to.be.eq(modified.description);
                    expect(response.body.webhook).to.be.eq(modified.webhook);
                    expect(response.body.cache).to.be.eq(modified.cache);
                    expect(response.body.live).to.be.eq(false); // this should never be affected
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
            return shared.clean_slate();
        });

        after(() => {
            return shared.clean_slate();
        });

        it('add the housing entity', () => {
            return chakram.post(shared.rest('register', entity))
            .then(response => {
                expect(response).to.have.status(201);
                return chakram.wait();
            });
        });

        it("can't modify a connector that is not there", () => {
            return chakram.put(shared.rest('register', entity, 'connector', connector), details)
            .then(response => {
                expect(response).to.have.status(404);
                return chakram.wait();
            });
        });

        it('add the housing connector', () => {
            return chakram.post(shared.rest('register', entity, 'connector', connector), details)
            .then(response => {
                expect(response).to.have.status(201);
                expect(response).to.have.header('Location', shared.rest('register', entity, 'connector', connector));
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

            for (let i = 0; i < DATA.WEBHOOKS.VALID.length; i++) {
                tests.push({ webhook: DATA.WEBHOOKS.VALID[i] });
            }

            return modify_tests(tests);
        });

        it('can modify the connector description value', () => {
            return modify_tests([
                { description: DATA.words() },
                { description: DATA.words(1) },
                { description: DATA.words(10) },
                { description: '' },
            ]);
        });

        it('can modify multiple connector values in same call', () => {
            return modify_tests([{
                cache: DATA.integer(DATA.CACHE.REASONABLE),
                webhook: DATA.oneof(DATA.WEBHOOKS.VALID),
                description: DATA.words(DATA.integer())
            }]);
        });

        it('can delete the entity type and all its connectors', () => {
            return chakram.delete(shared.rest('register', entity))
            .then(response => {
                expect(response).to.have.status(200);
                return chakram.wait();
            });
        });
    });

    describe('entity and connector wild card tests', () => {
    
    });

*/

});
