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

  Shared methods used by all test scripts

*/

'use strict'; // code assumes ECMAScript 6

// --- load configuration - do this first

require('dotenv').config({ path: '../.env' });
process.env.DATABASE = process.env.DATABASE.replace('CREDENTIALS', process.env.TESTS_USER);

// --- dependancies

const HTTP = require('http-status-codes');
const DATA = require('./data.js');
const Knex = require('knex');
const url = require('url');
const chakram = require('chakram');
const expect = chakram.expect;

// --- shared class

class Shared {

    // --- class constructor

    constructor() {
        this.db = null;
        this.api = {  // apis listed by restful prefix
            entity: process.env.COORDINATOR_BASE,
            connector: process.env.CONTRIBUTOR_BASE,
            policy: process.env.POLICY_BASE
        };
    }

    // --- returns a restful url to an known API service

    rest(...resources) {
        resources.unshift(resources.length ? this.api[resources[0]] : '');
        return resources.join('/');
    }

    // --- resets the underlying database

    nuke() {
        return this.db('entity').delete()  // will auto cascade to connectors, catalog, etc
        .then(() => {
            return this.db('policy').delete();
        });
    }

    // --- resets the catalog

    wipe() {
        return this.db('catalog').delete();
    }

    // --- before any tests are run

    before_any() {
        this.db = new Knex({ client: 'pg', connection: process.env.DATABASE });
        return this.nuke();
    }

    // --- after all the tests have been run

    after_all(wipe = true) {
        return (wipe ? this.nuke() : Promise.resolve())
        .then(() => {
            return this.db.destroy();
        });
    }

    // --- tests a server is up

    up(server) {
        return chakram.get(server)
        .then(response => {
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- tests a server announce message

    announce(server, name) {
        return chakram.get(server)
        .then(response => {
            expect(response.body).to.be.an('object');
            expect(response.body.now).to.match(new RegExp(DATA.DATE.REGEX));
            expect(response.body.name).to.be.equal(name);
            expect(response.body.version).to.match(new RegExp(DATA.VERSION.REGEX));
            expect(response.body.status).to.be.equal(DATA.STATUS);
            return chakram.wait();
        });
    }

    // --- ensures that the register is empty

    empty() {
        return chakram.get(this.rest('entity'))
        .then(response => {
            expect(response.body).to.be.an('array');
            expect(response.body.length).to.be.eq(0);
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }
}

// --- exported classes

module.exports = new Shared();
