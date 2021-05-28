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

  Add seed data to the system via the published APIs

*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const Entity = require('./entity.js');
const Connector = require('./connector.js');
const Session = require('./session.js');
const Policy = require('./policy.js');
const fs = require('fs');

// --- seeder class (exported)

module.exports = class Seeder {

    // --- returns entity seed data

    static get entities() {
        return JSON.parse(fs.readFileSync('./data/entities.json'));
    }

    // --- returns policy seed data

    static get policies() {
        return JSON.parse(fs.readFileSync('./data/policies.json'));
    }

    // --- returns record data for the given name

    static records(name) {
        return JSON.parse(fs.readFileSync(`./data/${ name }.json`));
    }

    // --- adds the housing entities

    static add_entities() {
        let steps = [];
        let entities = Seeder.entities;

        for (let i = 0; i < entities.length; i++) {
            let entity = entities[i];
            steps.push(Entity.add(entity.slug, entity.properties));
        }

        return Promise.all(steps);
    }

    // --- adds the housing connectors

    static add_connectors() {
        let steps = [];
        let entities = Seeder.entities;

        for (let i = 0; i < entities.length; i++) {
            let entity = entities[i];

            for (let j = 0; j < entity.connectors.length; j++) {
                let connector = entity.connectors[j];
                steps.push(Connector.add(entity.slug, connector.slug, connector.properties));
            }
        }

        return Promise.all(steps);
    }

    // --- adds all the seed data

    static add_seed_data() {
        let steps = [];
        let entities = Seeder.entities;

        for (let i = 0; i < entities.length; i++) {
            let entity = entities[i];

            for (let j = 0; j < entity.connectors.length; j++) {
                let connector = entity.connectors[j];
                let records = Seeder.records(entity.slug);
                steps.push(Session.records(entity.slug, connector.slug, records, 'stream', 'upsert', true));
            }
        }

        return Promise.all(steps);
    }

    // --- adds the policies

    static add_policies() {
        let steps = [];
        let policies = Seeder.policies;

        for (let i = 0; i < policies.length; i++) {
            let policy = policies[i];
            steps.push(Policy.add(policy.slug, policy.properties));
        }

        return Promise.all(steps);
    }
}
