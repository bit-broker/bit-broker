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

  Shared policy methods used by all test scripts

*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const HTTP = require('http-status-codes');
const DATA = require('./data.js');
const Shared = require('./shared.js');
const chakram = require('chakram');
const expect = chakram.expect;

// --- policy test class (exported)

module.exports = class Policy {

    // --- adds a policy

    static add(name, dsp = null) {
        return chakram.post(Shared.rest('policy', name), dsp)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.CREATED);
            expect(response).to.have.header('Location', Shared.rest('policy', name));
            return chakram.wait();
        });
    }

    // --- updates a policy

    static update(name, dsp) {
        return chakram.put(Shared.rest('policy', name), dsp)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- attempts to duplicate a policy

    static duplicate(name, dsp) {
        return chakram.post(Shared.rest('policy', name), dsp)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('conflict');
            expect(response).to.have.status(HTTP.CONFLICT);
            return chakram.wait();
        });
    }

    // --- deletes a policy

    static delete(name) {
        return chakram.delete(Shared.rest('policy', name))
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- checks a non-existent policy

    static missing(name) {
        return chakram.get(Shared.rest('policy', name))
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- verifies a policy
    static verify(name, dsp) {
        return chakram.get(Shared.rest('policy', name))
        .then(response => {
            expect(response.body).to.be.an('object');
            expect(response.body.id).to.be.eq(name);
            expect(response.body.url).to.be.eq(Shared.rest('policy', name));
            expect(response.body.policy).to.deep.equals(dsp);
            expect(response.body.name).to.be.eq(dsp.name);
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- verify a policy list

    static verify_all(policies) {
        policies.sort((a, b) => a.name.localeCompare(b.name)); // in name order
        return chakram.get(Shared.rest('policy'))
        .then(response => {
            expect(response.body).to.be.an('array');
            expect(response.body.length).to.be.eq(policies.length);
            for (let i = 0; i < policies.length; i++) {
                expect(response.body[i]).to.be.an('object');
                expect(response.body[i].id).to.be.eq(policies[i].name);
                expect(response.body[i].url).to.be.eq(Shared.rest('policy', policies[i].name));
                expect(response.body[i].policy).to.deep.equals(policies[i].dsp);
                expect(response.body[i].name).to.be.eq(policies[i].dsp.name);
            }
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }
}
