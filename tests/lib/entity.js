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

  Shared entity test methods 

*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const HTTP = require('http-status-codes');
const DATA = require('./data.js');
const Shared = require('./shared.js');
const chakram = require('chakram');
const expect = chakram.expect;

// --- entity test class (exported)

module.exports = class Entity {

    // --- adds an entity type

    static add(name, values = null) {
        return chakram.post(Shared.rest('entity', name), values || { description: DATA.text(DATA.DESCRIPTION.REASONABLE) })
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.CREATED);
            expect(response).to.have.header('Location', Shared.rest('entity', name));
            return chakram.wait();
        });
    }

    // --- updates an entity type

    static update(name, values) {
        return chakram.put(Shared.rest('entity', name), values)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- attempts to add a duplicate entity type

    static duplicate(name, values) {
        return chakram.post(Shared.rest('entity', name), values)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('conflict');
            expect(response).to.have.status(HTTP.CONFLICT);
            return chakram.wait();
        });
    }

    // --- deletes an entity type

    static delete(name) {
        return chakram.delete(Shared.rest('entity', name))
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- attempts to action an missing entity type

    static action_missing(action, name, values) {
        return action(Shared.rest('entity', name), values)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- checks an entity type is not there

    static missing(name) {
        return chakram.get(Shared.rest('entity', name))
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- verifies an entity type

    static verify(name, values) {
        return chakram.get(Shared.rest('entity', name))
        .then(response => {
            expect(response.body).to.be.an('object');
            expect(response.body.id).to.be.eq(name);
            expect(response.body.url).to.be.eq(Shared.rest('entity', name));
            expect(response.body.description).to.be.eq(values.description);
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- verifies the entire entity type list

    static verify_all(entities) {
        entities.sort((a, b) => a.name.localeCompare(b.name)); // in name order
        return chakram.get(Shared.rest('entity'))
        .then(response => {
            expect(response.body).to.be.an('array');
            expect(response.body.length).to.be.eq(entities.length);
            for (let i = 0; i < entities.length; i++) {
                expect(response.body[i]).to.be.an('object');
                expect(response.body[i].id).to.be.eq(entities[i].name);
                expect(response.body[i].url).to.be.eq(Shared.rest('entity', entities[i].name));
                expect(response.body[i].description).to.be.eq(entities[i].values.description);
            }
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- adds and then deleted an entity with a good name

    static good(action, name, values = null) {
        return action(Shared.rest('entity', name), values || { description: DATA.text(DATA.DESCRIPTION.REASONABLE) })
        .then(response => {
            expect(response).to.have.status(action == chakram.post ? HTTP.CREATED : HTTP.NO_CONTENT);
            return chakram.delete(Shared.rest('entity', name.toLowerCase().trim()))
            .then(response => {
                expect(response.body).to.be.undefined;
                expect(response).to.have.status(HTTP.NO_CONTENT);
                return chakram.wait();
            })
        });
    }

    // --- attemps to add an entity with a bad name

    static bad(action, name, type, error, values = null) {
        return action(Shared.rest('entity', name), values || { description: DATA.text(DATA.DESCRIPTION.REASONABLE) })
        .then(response => {
            expect(response.body).to.contain(type);
            expect(response.body).to.contain(error);
            expect(response).to.have.status(HTTP.BAD_REQUEST);
            return chakram.get(Shared.rest('entity', name))
            .then(response => {
                expect(response.body).to.be.a('string');
                expect(response.body.toLowerCase()).to.contain('not found');
                expect(response).to.have.status(HTTP.NOT_FOUND);
                return chakram.wait();
            })
        });
    }
}
