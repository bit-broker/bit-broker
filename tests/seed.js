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

const Shared = require('./lib/shared.js');  // include first for dotenv
const Seeder = require('./lib/seeder.js');

// --- the test cases

describe('Database Seeding', function() {

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
        return Seeder.add_entities();
    });

    it('create the housing connectors', () => {
        return Seeder.add_connectors();
    });

    it('add all the seed data', () => {
        return Seeder.add_seed_data();
    });

    it('create the policies', () => {
        return Seeder.add_policies();
    });

    it('create the users', () => {
        return Seeder.add_users();
    });

    it('create the accesses', () => {
        return Seeder.add_access();
    });
});
