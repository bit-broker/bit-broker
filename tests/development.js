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

  This is NOT a test script. Its a pragmatic script used to insert some test
  data into the schema for development purposes only.

  Use command 'mocha development'

  WARNING: Running this script will reset the entire database!

*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const HTTP = require('http-status-codes');
const DATA = require('./lib/data.js');
const Shared = require('./lib/shared.js');
const Entity = require('./lib/entity.js');
const Connector = require('./lib/connector.js');
const Session = require('./lib/session.js');
const chakram = require('chakram');
const expect = chakram.expect;
const util = require('util');

// --- the test cases

describe('Development Data', function() {

    // --- development data sizes

    const MIN_ENTITY = 1;
    const MAX_ENTITY = 8;
    const MIN_CONNECTOR = 0;
    const MAX_CONNECTOR = 4;
    const MIN_RECORD = 0;
    const MAX_RECORD = 16;

    // --- development data

    let entities = [];

    // -- prepares the random development data

    function prepare() {

        let e_count = DATA.integer(MAX_ENTITY, MIN_ENTITY);

        for (let e = 0 ; e < e_count ; e++) {
            let c_count = DATA.integer(MAX_CONNECTOR, MIN_CONNECTOR);
            entities.push({ name: DATA.pluck(DATA.NAME.VALID), connectors: [] });

            for (let c = 0 ; c < c_count ; c++) {
                let r_count = DATA.integer(MAX_RECORD, MIN_RECORD);
                entities[e].connectors.push({ name: DATA.pluck(DATA.NAME.VALID), records: DATA.someof(DATA.RECORDS, r_count) });
            }
        }
    };

    this.timeout(0); // we are not interested in non-functional tests here

    // --- before any tests are run

    before(() => {
        prepare();
        console.log(util.inspect(entities, { depth: null }));
        return Shared.before_any();
    });

    // --- after all the tests have been run

    after(() => {
        return Shared.after_all(false); // false = don't nuke the database
    });

    // --- inserts the test data

    describe('data insertion', () => {

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Promise.resolve(true); // no test to do here
        });

        it('can create the housing entities', () => {
            let steps = [];

            for (let e = 0 ; e < entities.length ; e++) {
                let entity = entities[e].name;
                steps.push(Entity.add(entity));
            }

            return Promise.all(steps);
        });

        it('can create the housing connectors', () => {
            let steps = [];

            for (let e = 0 ; e < entities.length ; e++) {
                for (let c = 0 ; c < entities[e].connectors.length ; c++) {
                    let entity = entities[e].name;
                    let connector = entities[e].connectors[c].name;
                    steps.push(Connector.add(entity, connector));
                }
            }

            return Promise.all(steps);
        });

        it('can add random records', () => {
            let steps = [];

            for (let e = 0 ; e < entities.length ; e++) {
                for (let c = 0 ; c < entities[e].connectors.length ; c++) {
                    let entity = entities[e].name
                    let connector = entities[e].connectors[c].name
                    let records = entities[e].connectors[c].records;
                    steps.push(Session.records(entity, connector, records, 'stream', 'upsert', true));
                }
            }

            return Promise.all(steps);
        });
    });
});
