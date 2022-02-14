/**
 * Copyright 2021 Cisco and its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/*
Add seed data to the system via the published APIs
*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const Shared = require('./shared.js');  // include first for dotenv
const URLs = require('./urls.js');
const Crud = require('./crud.js');
const Session = require('./session.js');
const fs = require('fs');

// --- seeder class (exported)

module.exports = class Seeder {

    // --- static variables

    static cids = {};
    static uids = {};

    // --- returns entity seed data

    static get entities() {
        return JSON.parse(fs.readFileSync('./data/entities.json'));
    }

    // --- returns policy seed data

    static get policies() {
        return JSON.parse(fs.readFileSync('./data/policies.json'));
    }

    // --- returns user seed data

    static get users() {
        return JSON.parse(fs.readFileSync('./data/users.json'));
    }

    // --- returns record data for the given name

    static records(name) {
        return JSON.parse(fs.readFileSync(`./data/${ name }.json`));
    }

    // --- returns a record for the given name and id

    static record(name, id) {
        return this.records(name).find(i => i.id === id);
    }

    // --- adds the housing entities

    static add_entities() {
        let steps = [];
        let entities = Seeder.entities;

        for (let i = 0; i < entities.length; i++) {
            let entity = entities[i];
            steps.push(Crud.add(URLs.entity(entity.slug), entity.properties));
        }

        return Promise.all(steps);
    }

    // --- adds the housing connectors

    static add_connectors(webhooks = []) {
        let steps = [];
        let entities = Seeder.entities;

        this.cids = {};

        for (let i = 0; i < entities.length; i++) {
            let entity = entities[i];

            for (let j = 0; j < entity.connectors.length; j++) {
                let connector = entity.connectors[j];
                let webhook = webhooks.find(i => i.entity === entity.slug && i.connector == connector.slug);

                connector.properties.webhook = webhook ? webhook.url : null; // add a webhook if specified in parameters

                steps.push(Crud.add(URLs.connector(entity.slug, connector.slug), connector.properties, null, result => {
                    this.cids[`${ entity.slug }/${ connector.slug }`] = `${ entity.slug }/${ result.id }`;  // stash the connector id for later bbk mapping
                }));
            }
        }

        return Promise.all(steps);
    }

    // --- maps bbk links by adding in the contributor id - only for top level strings on the entity object

    static map_bbk_links(records) {
        for (let i = 0 ; i < records.length ; i++) {
            for (let j in records[i].entity) {
                if (typeof records[i].entity[j] === 'string') {
                    for (let k in this.cids) {
                        records[i].entity[j] = records[i].entity[j].replace(`bbk://${ k }`, `bbk://${ this.cids[k] }`);
                    }
                }
            }
        }
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

                this.map_bbk_links(records);
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
            steps.push(Crud.add(URLs.policy(policy.slug), policy.properties));
        }

        return Promise.all(steps);
    }

    // --- adds the users

    static add_users() {
        let steps = [];
        let users = Seeder.users;

        this.uids = {};

        for (let i = 0; i < users.length; i++) {
            let user = users[i];
            steps.push(Crud.add(URLs.user(), user.properties, undefined, (body, location) =>
            {
                this.uids[user.properties.email] = parseInt(location.match(/\d+$/).shift()); // stash use id for later use by other functions
            }));
        }

        return Promise.all(steps);
    }

    // --- adds consumer accesses

    static add_consumer_access() {
        let steps = [];
        let users = Seeder.users;

        for (let i = 0; i < users.length; i++) {
            let user = users[i];

            for (let j = 0; j < user.access.length; j++) {
                let access = user.access[j];
                let uid = this.uids[user.properties.email];
                steps.push(Crud.add(URLs.access(uid), { role: 'consumer', context: access }));
            }
        }

        return Promise.all(steps);
    }

    // --- adds any coordinator access

    static add_coordinator_access() {
        let steps = [];
        let users = Seeder.users;

        for (let i = 0; i < users.length; i++) {
            let user = users[i];

            if (user.coordinator) {
                let uid = this.uids[user.properties.email];
                steps.push(Crud.add(URLs.access(uid), { role: 'coordinator', context: null }));
            }
        }

        return Promise.all(steps);
    }
}
