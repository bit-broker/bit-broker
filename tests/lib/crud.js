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

  Shared restful CRUD test methods

*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const HTTP = require('http-status-codes');
const chakram = require('chakram');
const expect = chakram.expect;

// --- crud class (exported)

module.exports = class Crud {

    // --- adds a resource

    static add(url, body, location) {
        location = location || url.trim();
        return chakram.post(url, body)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.CREATED);
            expect(response).to.have.header('Location', location);
            return chakram.wait();
        });
    }

    // --- attempts to add a duplicate resource

    static duplicate(url, body) {
        return chakram.post(url, body)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('conflict');
            expect(response).to.have.status(HTTP.CONFLICT);
            return chakram.wait();
        });
    }

    // --- updates a resource

    static update(url, body) {
        return chakram.put(url, body)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- deletes a resource

    static delete(url) {
        return chakram.delete(url)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- attempts to action a not found resource

    static not_found(url, body = undefined, action = chakram.get) {
        return action(url, body)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- attempts a bad request on a resource

    static bad_request(url, errors, body = undefined, action = chakram.get) {
        return action(url, body)
        .then(response => {
            expect(response.body).to.be.a('string');
            for (let i = 0; i < errors.length; i++) {
                for (let j in errors[i]) {
                    expect(response.body.toLowerCase()).to.contain(j);
                    expect(response.body.toLowerCase()).to.contain(errors[i][j]);
                }
            }
            expect(response).to.have.status(HTTP.BAD_REQUEST);
            return chakram.wait();
        });
    }

    // --- attempts a unauthorized request on a resource

    static unauthorized(url, body = undefined, action = chakram.get) {
        return action(url, body)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('unauthorized');
            expect(response).to.have.status(HTTP.UNAUTHORIZED);
            return chakram.wait();
        });
    }

    // --- verifies a resource

    static verify(url, resource, include = true) {
        return chakram.get(url)
        .then(response => {
            expect(response.body).to.be.an('object');
            include ? expect(response.body).to.deep.include(resource) : expect(response.body).to.deep.equal(resource);
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- verifies the entire resource list

    static verify_all(url, resources, include = true) {
        resources.sort((a, b) => a.id.toString().localeCompare(b.id.toString(), undefined, {'numeric': true})); // in id order
        return chakram.get(url)
        .then(response => {
            expect(response.body).to.be.an('array');
            expect(response.body.length).to.be.eq(resources.length);
            for (let i = 0; i < resources.length; i++) {
                include ? expect(response.body[i]).to.deep.include(resources[i]) : expect(response.body[i]).to.deep.equal(resources[i]);
            }
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- adds and then deletes a resource

    static add_del(url, body, resource) {
        return Crud.add(url, body)
        .then (() => Crud.verify(url, resource || body))
        .then (() => Crud.delete(url));
    }
}
