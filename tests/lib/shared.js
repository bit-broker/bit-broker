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

// --- load configuration

require('dotenv').config({ path: '../.env' });

// --- dependancies

const HTTP = require('http-status-codes');
const Knex = require('knex');
const chakram = require('chakram');
const url = require('url');
const expect = chakram.expect;

// --- constants

const DATA = require('./data.js');

// --- shared class

class Shared {

    // --- class constructor

    constructor() {
        this.catalog = process.env.CATALOG_SERVER_BASE.replace(/\/$/g, ''); // without trailing slash
        this.register = process.env.REGISTER_SERVER_BASE.replace(/\/$/g, ''); // without trailing slash
        this.db = null;
    }

    // --- returns a restful url to either the catalog or register service

    rest(...resources) {
        resources.unshift(resources.length && resources[0] === 'entity' ? this.register : this.catalog);
        return resources.join('/');
    }

    // --- resets the underlying database - use with care!

    nuke() {
        return this.db('entity').delete();
    }

    // --- before any tests are run

    before_any() {
        this.db = new Knex({ client: 'pg', connection: process.env.DB_CONNECT });
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

    announce(server, name, base) {
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

    // --- tests for an expected bad route

    is_bad_route(url, verb = chakram.get) {
        return verb(url)
        .then(response => {
            expect(response.body).to.be.a('string');
            expect(response.body.toLowerCase()).to.contain('not found');
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }
}

// --- exported classes

module.exports = new Shared();
