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

  Shared policy test methods

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

    static add(slug, dsp = null) {
        return chakram.post(Shared.rest('policy', slug), dsp)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.CREATED);
            expect(response).to.have.header('Location', Shared.rest('policy', slug));
            return chakram.wait();
        });
    }

    // --- updates a policy

    static update(slug, dsp) {
        return chakram.put(Shared.rest('policy', slug), dsp)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- attempts to duplicate a policy

    static duplicate(slug, dsp) {
        return chakram.post(Shared.rest('policy', slug), dsp)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('conflict');
            expect(response).to.have.status(HTTP.CONFLICT);
            return chakram.wait();
        });
    }

    // --- deletes a policy

    static delete(slug) {
        return chakram.delete(Shared.rest('policy', slug))
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- checks a non-existent policy

    static missing(slug) {
        return chakram.get(Shared.rest('policy', slug))
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }

    // --- verifies a policy
    static verify(slug, dsp) {
        return chakram.get(Shared.rest('policy', slug))
        .then(response => {
            expect(response.body).to.be.an('object');
            expect(response.body.id).to.be.eq(slug);
            expect(response.body.url).to.be.eq(Shared.rest('policy', slug));
            expect(response.body.policy).to.deep.equals(dsp.policy);
            expect(response.body.name).to.be.eq(dsp.name);
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- verify a policy list

    static verify_all(policies) {
        policies.sort((a, b) => a.slug.localeCompare(b.slug)); // in slug order
        return chakram.get(Shared.rest('policy'))
        .then(response => {
            expect(response.body).to.be.an('array');
            expect(response.body.length).to.be.eq(policies.length);
            for (let i = 0; i < policies.length; i++) {
                expect(response.body[i]).to.be.an('object');
                expect(response.body[i].id).to.be.eq(policies[i].slug);
                expect(response.body[i].url).to.be.eq(Shared.rest('policy', policies[i].slug));
                expect(response.body[i].name).to.be.eq(policies[i].dsp.name);
            }
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }
}
