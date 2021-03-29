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

// --- running contexts

var db = new Knex({ client: 'pg', connection: process.env.DB_CONNECT });

// --- shared class

class Shared {

    // --- class constructor

    constructor() {
        this.catalog = process.env.CATALOG_SERVER_BASE.replace(/\/$/g, ''); // without trailing slash
        this.register = process.env.REGISTER_SERVER_BASE.replace(/\/$/g, ''); // without trailing slash
    }

    // --- returns a restful url to either the catalog or register service

    rest(...resources) {
        resources.unshift(resources.length && resources[0] === 'entity' ? this.register : this.catalog);
        return resources.join('/');
    }

    // --- resets the underlying database - use with care!

    nuke() {
        return db('entity').delete();
    }

    // --- before any tests are run

    before_any() {
        return this.nuke();
    }

    // --- after all the tests have been run

    after_all(wipe = true) {
        return (wipe ? this.nuke() : Promise.resolve())
        .then(() => {
            return db.destroy();
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
            expect(response.body).to.be.a('string');
            let elements = response.body.split(' - ');
            let parts = url.parse(base);
            expect(elements).to.be.an('array');
            expect(elements.length).to.be.equal(4);
            expect(elements[0]).to.match(new RegExp(DATA.DATE.REGEX));
            expect(elements[1]).to.be.equal(name);
            expect(elements[2]).to.be.equal(parts.path.replace(/^\/|\/$/g, ''));
            expect(elements[3]).to.be.equal(DATA.STATUS);
            return chakram.wait();
        });
    }
    // --- ensures that the register is currently empty

    is_clean_slate() {
        return chakram.get(this.rest('entity'))
        .then(response => {
            expect(response).to.have.status(HTTP.OK);
            expect(response.body).to.be.an('array');
            expect(response.body.length).to.be.eq(0);
            return chakram.wait();
        });
    }

    // --- tests for an expected bad request with the given error strings

    is_bad_request(url, errors, verb = chakram.get) {
        return verb(url)
        .then(response => {
            expect(response).to.have.status(HTTP.BAD_REQUEST);
            for (let i = 0; i < errors.length; i++) {
                expect(response.body).to.contain(errors[i]);
            }
            return chakram.wait();
        });
    }

    // --- tests for an expected bad route

    is_bad_route(url, verb = chakram.get) {
        return verb(url)
        .then(response => {
            expect(response).to.have.status(HTTP.NOT_FOUND);
            return chakram.wait();
        });
    }
}

// --- exported classes

module.exports = new Shared();
