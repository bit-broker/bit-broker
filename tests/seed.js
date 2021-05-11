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

const DATA = require('./lib/data.js');
const Shared = require('./lib/shared.js');
const Entity = require('./lib/entity.js');
const Connector = require('./lib/connector.js');
const Session = require('./lib/session.js');
const fs = require('fs');

// --- the test cases

describe('Database Seeding', function() {

    // --- development data

    let entities = [];

    // --- test context

    this.timeout(0); // we are not interested in non-functional tests here

    // --- before any tests are run

    before(() => {
        return Shared.before_any();
    });

    // --- after all the tests have been run

    after(() => {
        return Shared.after_all(false); // false = don't nuke the database
    });

    it('create the housing entities', () => {
        return Entity.add('country', {
            name: 'Countries',
            description: 'Basic country information',
            schema: {}
        });
    });

    it('create the housing connectors', () => {
        return Connector.add('country', 'world-factbook', {
            name: 'World Factbook',
            description: 'Country information from the CIA World Factbook',
            webhook: null,
            cache: 0
        });
    });

    it('add all the seed data', () => {
        let records = JSON.parse(fs.readFileSync('./data/countries.json'));
        return Session.records('country', 'world-factbook', records, 'stream', 'upsert', true);
    });
});
