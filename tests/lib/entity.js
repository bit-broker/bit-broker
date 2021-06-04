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

    // --- returns an example entity properties body

    static get example() {
        return {
            name: DATA.slug(),
            description: DATA.text(DATA.DESCRIPTION.REASONABLE)
        };
    }

    // --- adds an entity type

    static add(slug, values = null) {
        return chakram.post(Shared.rest('entity', slug), values || this.example)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.CREATED);
            expect(response).to.have.header('Location', Shared.rest('entity', slug));
            return chakram.wait();
        });
    }

    // --- updates an entity type

    static update(slug, values) {
        return chakram.put(Shared.rest('entity', slug), values)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- attempts to add a duplicate entity type

    static duplicate(slug, values) {
        return chakram.post(Shared.rest('entity', slug), values)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('conflict');
            expect(response).to.have.status(HTTP.CONFLICT);
            return chakram.wait();
        });
    }

    // --- deletes an entity type

    static delete(slug) {
        return chakram.delete(Shared.rest('entity', slug))
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- attempts to action an missing entity type

    static action_missing(action, slug, values) {
        return action(Shared.rest('entity', slug), values)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- checks an entity type is not there

    static missing(slug) {
        return chakram.get(Shared.rest('entity', slug))
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- verifies an entity type

    static verify(slug, values) {
        return chakram.get(Shared.rest('entity', slug))
        .then(response => {
            expect(response.body).to.be.an('object');
            expect(response.body.id).to.be.eq(slug);
            expect(response.body.url).to.be.eq(Shared.rest('entity', slug));
            expect(response.body.description).to.be.eq(values.description);
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- verifies the entire entity type list

    static verify_all(entities) {
        entities.sort((a, b) => a.slug.localeCompare(b.slug)); // in slug order
        return chakram.get(Shared.rest('entity'))
        .then(response => {
            expect(response.body).to.be.an('array');
            expect(response.body.length).to.be.eq(entities.length);
            for (let i = 0; i < entities.length; i++) {
                expect(response.body[i]).to.be.an('object');
                expect(response.body[i].id).to.be.eq(entities[i].slug);
                expect(response.body[i].url).to.be.eq(Shared.rest('entity', entities[i].slug));
                expect(response.body[i].description).to.be.eq(entities[i].values.description);
            }
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- adds and then deletes an entity with a good slug

    static good(action, slug, values = null) {
        return action(Shared.rest('entity', slug), values || this.example)
        .then(response => {
            expect(response).to.have.status(action == chakram.post ? HTTP.CREATED : HTTP.NO_CONTENT);
            return chakram.delete(Shared.rest('entity', slug.toLowerCase().trim()))
            .then(response => {
                expect(response.body).to.be.undefined;
                expect(response).to.have.status(HTTP.NO_CONTENT);
                return chakram.wait();
            })
        });
    }

    // --- attemps to add an entity with a bad slug

    static bad(action, slug, type, error, values = null) {
        return action(Shared.rest('entity', slug), values || this.example)
        .then(response => {
            expect(response.body).to.contain(type);
            expect(response.body).to.contain(error);
            expect(response).to.have.status(HTTP.BAD_REQUEST);
            return chakram.get(Shared.rest('entity', slug))
            .then(response => {
                expect(response.body).to.be.a('string');
                expect(response.body.toLowerCase()).to.contain('not found');
                expect(response).to.have.status(HTTP.NOT_FOUND);
                return chakram.wait();
            })
        });
    }
}
