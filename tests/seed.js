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

const Shared = require('./lib/shared.js');
const Entity = require('./lib/entity.js');
const Connector = require('./lib/connector.js');
const Session = require('./lib/session.js');
const Policy = require('./lib/policy.js');
const fs = require('fs');

// --- the test cases

describe('Database Seeding', function() {

    // --- seed data

    let entities = [];
    let policies = [];

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

    it('load seed data', () => {
        entities = JSON.parse(fs.readFileSync('./data/entities.json'));
        policies = JSON.parse(fs.readFileSync('./data/policies.json'));
        return Promise.resolve(true);
    });

    it('create the housing entities', () => {
        let steps = [];

        for (let i = 0; i < entities.length; i++) {
            let entity = entities[i];
            steps.push(Entity.add(entity.slug, entity.properties));
        }

        return Promise.all(steps);
    });

    it('create the housing connectors', () => {
        let steps = [];

        for (let i = 0; i < entities.length; i++) {
            let entity = entities[i];

            for (let j = 0; j < entity.connectors.length; j++) {
                let connector = entity.connectors[j];
                steps.push(Connector.add(entity.slug, connector.slug, connector.properties));
            }
        }

        return Promise.all(steps);
    });

    it('add all the seed data', () => {
        let steps = [];

        for (let i = 0; i < entities.length; i++) {
            let entity = entities[i];

            for (let j = 0; j < entity.connectors.length; j++) {
                let connector = entity.connectors[j];
                let records = JSON.parse(fs.readFileSync(`./data/${ entity.slug }.json`));
                steps.push(Session.records(entity.slug, connector.slug, records, 'stream', 'upsert', true));
            }
        }

        return Promise.all(steps);
    });

    it('create the policies', () => {
        let steps = [];

        for (let i = 0; i < policies.length; i++) {
            let policy = policies[i];
            steps.push(Policy.add(policy.slug, policy.properties));
        }

        return Promise.all(steps);
    });
});
