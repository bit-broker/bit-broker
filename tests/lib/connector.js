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

  Shared connector test methods

*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const HTTP = require('http-status-codes');
const DATA = require('./data.js');
const Shared = require('./shared.js');
const chakram = require('chakram');
const expect = chakram.expect;

// --- connector test class (exported)

module.exports = class Connector {

    // --- adds a connector to an entity type

    static add(entity, connector, values = null) {
        let details = {
            description: DATA.text(DATA.DESCRIPTION.REASONABLE),
            webhook: DATA.pick(DATA.WEBHOOK.VALID),
            cache: DATA.integer(DATA.CACHE.REASONABLE),
        };

        return chakram.post(Shared.rest('entity', entity, 'connector', connector), values || details)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.CREATED);
            expect(response).to.have.header('Location', Shared.rest('entity', entity, 'connector', connector));
            return chakram.wait();
        });
    }

    // --- perform tests with a given connector on an entity type

    static with(entity, connector, cb) {
        return chakram.get(Shared.rest('entity', entity, 'connector', connector))
        .then(response => {
            expect(response.body).to.be.an('object');
            return chakram.wait().then(() => cb(response.body));
        });
    }

    // --- updates a connector on an entity type

    static update(entity, connector, values) {
        return chakram.put(Shared.rest('entity', entity, 'connector', connector), values)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- attempts to add a duplicate connector to an entity type

    static duplicate(entity, connector, values) {
        return chakram.post(Shared.rest('entity', entity, 'connector', connector), values)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('conflict');
            expect(response).to.have.status(HTTP.CONFLICT);
            return chakram.wait();
        });
    }

    // --- attempts to add a connector to a missing entity type

    static add_to_missing(entity, connector, values) {
        return chakram.post(Shared.rest('entity', entity, 'connector', connector), values)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- deletes a connector from an entity type

    static delete(entity, connector) {
        return chakram.delete(Shared.rest('entity', entity, 'connector', connector))
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- attempts to delete a missing connector on an entity type

    static delete_missing(entity, connector) {
        return chakram.delete(Shared.rest('entity', entity, 'connector', connector))
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- checks a connector is not present on an entity type

    static missing(entity, connector) {
        return chakram.get(Shared.rest('entity', entity, 'connector', connector))
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- checks connectors are not returned for a missing parent entity

    static missing_parent(entity) {
        return chakram.get(Shared.rest('entity', entity, 'connector'))
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- attempts an action for a missing parent entity

    static action_missing(action, entity, connector, values) {
        return action(Shared.rest('entity', entity, 'connector', connector), values)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- verifies a connector of an entity type

    static verify(entity, connector, values) {
        return chakram.get(Shared.rest('entity', entity, 'connector', connector))
        .then(response => {
            expect(response.body).to.be.an('object');
            expect(response.body.id).to.be.eq(connector);
            expect(response.body.url).to.be.eq(Shared.rest('entity', entity, 'connector', connector));
            expect(response.body.description).to.be.eq(values.description);
            expect(response.body.entity).to.be.an('object');
            expect(response.body.entity.id).to.be.eq(entity);
            expect(response.body.entity.url).to.be.eq(Shared.rest('entity', entity));
            expect(response.body.contribution).to.be.an('object');
            expect(response.body.contribution.id).to.match(new RegExp(DATA.ID.REGEX));
            expect(response.body.contribution.id.length).to.be.eq(DATA.ID.SIZE);
            expect(response.body.contribution.url).to.be.eq(Shared.rest('connector', response.body.contribution.id));
            expect(response.body.webhook).to.be.eq(values.webhook);
            expect(response.body.cache).to.be.eq(values.cache);
            expect(response.body.in_session).to.be.eq(false);
            expect(response).to.have.status(HTTP.OK);

            return chakram.wait();
        });
    }

    // --- verifies the entire connector list for an entity type

    static verify_all(entity, connectors) {
        connectors.sort((a, b) => a.name.localeCompare(b.name)); // in name order
        return chakram.get(Shared.rest('entity', entity, 'connector'))
        .then(response => {
            expect(response.body).to.be.an('array');
            expect(response.body.length).to.be.eq(connectors.length);
            for (let i = 0; i < connectors.length; i++) {
                expect(response.body[i]).to.be.an('object');
                expect(response.body[i].id).to.be.eq(connectors[i].name);
                expect(response.body[i].url).to.be.eq(Shared.rest('entity', entity, 'connector', connectors[i].name));
                expect(response.body[i].description).to.be.eq(connectors[i].values.description);
            }
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- adds, checks the defaults and deletes a connector

    static check_defaults(entity, connector, values) {
        return Connector.add(entity, connector, values)
        .then(() => {
            return chakram.get(Shared.rest('entity', entity, 'connector', connector))
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

    static bad(entity, connector, values, errors, delta = {}) {
        let merged = Object.assign({}, values, Object.assign({}, delta)); // merges without destroying original
        return chakram.post(Shared.rest('entity', entity, 'connector', connector), merged)
        .then(response => {
            for (let i = 0; i < errors.length; i++) {
                for (let j in errors[i]) {
                    expect(response.body).to.contain(j);
                    expect(response.body).to.contain(errors[i][j]);
                }
            }
            expect(response).to.have.status(HTTP.BAD_REQUEST);
            return chakram.get(Shared.rest('entity', entity, 'connector', connector))
            .then(response => {
                expect(response.body).to.be.a('string');
                expect(response.body.toLowerCase()).to.contain('not found');
                expect(response).to.have.status(HTTP.NOT_FOUND);
                return chakram.wait();
            })
        });
    }
}
