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
process.env.APP_DATABASE = process.env.APP_DATABASE.replace('CREDENTIALS', process.env.TESTS_USER);

// --- dependancies

const HTTP = require('http-status-codes');
const DATA = require('./data.js');
const Knex = require('knex');
const url = require('url');
const chakram = require('chakram');
const expect = chakram.expect;

// --- URLs class (embedded)

class URLs {

    // --- class constructor

    constructor() {
        this.api = {  // apis listed by restful prefix
            entity: process.env.COORDINATOR_BASE,
            connector: process.env.CONTRIBUTOR_BASE,
            policy: process.env.COORDINATOR_BASE,
            user: process.env.COORDINATOR_BASE
        };
    }

    // --- returns a restful url to an known API service

    rest(...resources) {
        resources.unshift(resources.length ? this.api[resources[0]] : undefined);
        resources = resources.filter(item => item != undefined);
        return resources.join('/');
    }

    // --- restful access points

    entity(eid) { return this.rest('entity', eid); }
    connector(eid, cid) { return this.rest('entity', eid, 'connector', cid); }
    user(uid) { return this.rest('user', uid); }
    access(uid, aid) { return this.rest('user', uid, 'access', aid); }
    policy(pid, resource) { return this.rest('policy', pid, resource); }

    session_open(cid, mode = 'stream') { return this.rest('connector', cid, 'session', 'open', mode); }
    session_action(cid, sid, action = 'upsert') { return this.rest('connector', cid, 'session', sid, action); }
    session_close(cid, sid, commit = true) { return this.rest('connector', cid, 'session', sid, 'close', commit ? 'true' : 'false'); }
}

// --- shared class

class Shared {

    // --- class constructor

    constructor() {
        this.db = null;
        this.urls = new URLs();
    }

    // --- resets the underlying database

    nuke() {
        return this.db('entity').delete()  // will auto cascade to connectors, catalog, etc
        .then(() => this.db('users').delete())
        .then(() => this.db('policy').delete());
    }

    // --- resets the catalog

    wipe() {
        return this.db('catalog').delete();
    }

    // --- the last sequence id value

    last_id(table, column = 'id') {
        return this.db(`${ table }_${ column }_seq`).select('last_value').first().then(item => {
            let last = parseInt(item.last_value);
            return last == 1 ? 0 : last; // last_value == 1 when the sequence has never been used, so we shift to zero to allow clients to +1 it
        });
    }

    // --- before any tests are run

    before_any() {
        this.db = new Knex({ client: 'pg', connection: process.env.APP_DATABASE });
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

    // --- checks there is nothing present at the rest resource point

    nowt(url) {
        return chakram.get(url)
        .then(response => {
            expect(response.body).to.be.an('array');
            expect(response.body.length).to.be.eq(0);
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- ensures that the database is empty

    empty() {
        return this.nowt(this.urls.entity())
        .then(() => this.nowt(this.urls.user()))
        .then(() => this.nowt(this.urls.policy()));
    }

    // --- tests a catalog query

    catalog(test) {

        test.except = test.except || [];
        test.policy = test.policy || DATA.POLICY.ALLAREA.ID;

        return chakram.get(`${ process.env.CONSUMER_BASE }/catalog?q=${ JSON.stringify(test.query) }`, { headers: { 'x-bb-policy': test.policy }})

        .then(response => {
            expect(response.body).to.be.an('array');
            let items = response.body.map(i => i.name);

            for (let i = 0; i < test.yields.length; i++) {
                if (!test.except.includes(test.yields[i])) {
                    expect(items).to.include(test.yields[i]);
                }
            }

            for (let i = 0; i < test.except.length; i++) {
                expect(items).to.not.include(test.except[i]);
            }

            expect(items.length).to.be.eq(test.yields.length - test.except.length);

            return chakram.wait();
        });
    }
}

// --- exported classes

module.exports = new Shared();
