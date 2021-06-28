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

  Whole system end-to-end test - use command 'mocha end2end'

  WARNING: Running this script will reset the entire database!

*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const Crud = require('./lib/crud.js');
const Seeder = require('./lib/seeder.js');
const URLs = require('./lib/urls.js');
const chakram = require('chakram');

// --- constanst

const LOCAL = process.env.TESTS_LOCAL_MODE || false; // tests on a local environment not a full k8s deployment
const PAGE = 50; // number of records in a singel data upsert

// --- the test cases

describe('End-to-End Tests', function() {

    this.timeout(0); // we are not interested in non-functional tests here

    let admin = { id: 1, url: URLs.user(1), name: 'admin' };
    let policies = Seeder.policies;
    let coordinator = Seeder.users.find(e => e.properties.name === 'alice');
    let consumer = Seeder.users.find(e => e.properties.name === 'bob');
    let country = Seeder.entities.find(e => e.slug === 'country');
    let site = Seeder.entities.find(e => e.slug === 'heritage-site');
    let countries = Seeder.records(country.slug);
    let sites = Seeder.records(site.slug);

    it('tests are in production mode', function () {
        return LOCAL ? this.skip() : true;
    });

    it('enable the bootstrap key', function () {
        Crud.headers({ authorizaion: process.env.TESTS_BOOTSTRAP_KEY });
    });

    it('the coordinator api is accessible', function () {
        return Promise.all([
            Crud.get(URLs.coordinator()),
            Crud.get(URLs.entity()),
            Crud.get(URLs.policy()),
            Crud.get(URLs.user())
        ]);
    });

    it('the contributor api not is accessible', function () {
        return LOCAL ? this.skip() : Crud.not_found(URLs.contributor());
    });

    it('the consumer api is not accessible', function () {
        return LOCAL ? this.skip() : Promise.all([
            Crud.not_found(URLs.consumer()),
            Crud.not_found(URLs.consumer_entity()),
            Crud.not_found(URLs.consumer_catalog())
        ]);
    });

    it('there are no entities present', function () {
        return Crud.verify_all(URLs.entity(), []);
    });

    it('there are no policies present', function () {
        return Crud.verify_all(URLs.policy(), []);
    });

    it('there is only the admin user present', function () {
        return Crud.verify_all(URLs.user(), [admin]);
    });

    it('create the coordinator user', function () {
        return Crud.add(URLs.user(), coordinator.properties, undefined, (body, location) => {
            coordinator.uid = parseInt(location.match(/\d+$/).shift());
        });
    });

    it('generate a key for the coordinator user', function () {
        return Crud.add(URLs.access(coordinator.uid), { role: 'coordinator' }, undefined, (token) => {
            coordinator.token = token;
        });
    });

    it('switch to the coordinator key', function () {
        Crud.headers({ authorizaion: coordinator.token });
    });

    it('the coordinator api is still accessible', function () {
        return Promise.all([
            Crud.get(URLs.coordinator()),
            Crud.get(URLs.entity()),
            Crud.get(URLs.policy()),
            Crud.get(URLs.user())
        ]);
    });

    it('the contributor api is still not accessible', function () {
        return LOCAL ? this.skip() : Crud.not_found(URLs.contributor());
    });

    it('the consumer api is still not accessible', function () {
        return LOCAL ? this.skip() : Promise.all([
            Crud.not_found(URLs.consumer()),
            Crud.not_found(URLs.consumer_entity()),
            Crud.not_found(URLs.consumer_catalog())
        ]);
    });

    it('create the country entity', function () {
        return Crud.add(URLs.entity(country.slug), country.properties);
    });

    it('create the country entity connector', function () {
        return Crud.add(URLs.connector(country.slug, country.connectors[0].slug), country.connectors[0].properties, undefined, (details) => {
            country.connectors[0].id = details.id;
            country.connectors[0].token = details.token;
        });
    });

    it('switch to country connector key', function () {
        Crud.headers({ authorizaion: country.connectors[0].token });
    });

    it('the coordinator api is not accessible', function () {
        return LOCAL ? this.skip() : Promise.all([
            Crud.not_found(URLs.coordinator()),
            Crud.not_found(URLs.entity()),
            Crud.not_found(URLs.policy()),
            Crud.not_found(URLs.user())
        ]);
    });

    it('the contributor api is accessible', function () {
        return Crud.get(URLs.contributor());
    });

    it('the consumer api is not accessible', function () {
        return LOCAL ? this.skip() : Promise.all([
            Crud.not_found(URLs.consumer()),
            Crud.not_found(URLs.consumer_entity()),
            Crud.not_found(URLs.consumer_catalog())
        ]);
    });

    it('open a stream session on country', function () {
        return Crud.get(URLs.session_open(country.connectors[0].id, 'stream'), (session) => {
            country.connectors[0].session = session;
        });
    });

    it('upsert the country records into the session', function () {
        let act = Promise.resolve();
        let url = URLs.session_action(country.connectors[0].id, country.connectors[0].session, 'upsert');

        for (let i = 0 ; i < countries.length ; i += PAGE) {
            act = act.then(() => Crud.post(url, countries.slice(i, i + PAGE)));
        };

        return act;
    });

    it('close the stream session on country', function () {
        return Crud.get(URLs.session_close(country.connectors[0].id, country.connectors[0].session, 'true'));
    });

    it('switch to the coordinator key', function () {
        Crud.headers({ authorizaion: coordinator.token });
    });

    it('create the heritage-site entity', function () {
        return Crud.add(URLs.entity(site.slug), site.properties);
    });

    it('create the heritage-site entity connector', function () {
        return Crud.add(URLs.connector(site.slug, site.connectors[0].slug), site.connectors[0].properties, undefined, (details) => {
            site.connectors[0].id = details.id;
            site.connectors[0].token = details.token;
        });
    });

    it('switch to heritage-site connector key', function () {
        Crud.headers({ authorizaion: site.connectors[0].token });
    });

    it('open a stream session on heritage-site', function () {
        return Crud.get(URLs.session_open(site.connectors[0].id, 'stream'), (session) => {
            site.connectors[0].session = session;
        });
    });

    it('upsert the heritage-site records into the session', function () {
        let act = Promise.resolve();
        let url = URLs.session_action(site.connectors[0].id, site.connectors[0].session, 'upsert');

        for (let i = 0 ; i < sites.length ; i += PAGE) {
            act = act.then(() => Crud.post(url, sites.slice(i, i + PAGE)));
        };

        return act;
    });

    it('close the stream session on heritage-site', function () {
        return Crud.get(URLs.session_close(site.connectors[0].id, site.connectors[0].session, 'true'));
    });

    it('switch to the coordinator key', function () {
        Crud.headers({ authorizaion: coordinator.token });
    });

    it('add all the policies', function () {
        let act = [];

        for (let i = 0; i < policies.length; i++) {
            act.push (Crud.add(URLs.policy(policies[i].slug), policies[i].properties));
        }

        return Promise.all(act);
    });

    it('add the consumer user', function () {
        return Crud.add(URLs.user(), consumer.properties, undefined, (body, location) => {
            consumer.uid = parseInt(location.match(/\d+$/).shift());
        });
    });

    it('generate a key for the consumer user for the access-all-areas policy', function () {
        return Crud.add(URLs.access(consumer.uid), { role: 'consumer', context: 'access-all-areas' }, undefined, (token) => {
            consumer.token = token;
        });
    });

    it('switch to the consumer key', function () {
        let headers = { authorizaion: consumer.token };
        if (LOCAL) headers ['x-bb-policy'] = 'access-all-areas';
        Crud.headers(headers);
    });

    it('the coordinator api is not accessible', function () {
        return LOCAL ? this.skip() : Promise.all([
            Crud.not_found(URLs.coordinator()),
            Crud.not_found(URLs.entity()),
            Crud.not_found(URLs.policy()),
            Crud.not_found(URLs.user())
        ]);
    });

    it('the contributor api is not accessible', function () {
        return LOCAL ? this.skip() : Crud.not_found(URLs.contributor());
    });

    it('the consumer api is accessible', function () {
        return Promise.all([
            Crud.get(URLs.consumer()),
            Crud.get(URLs.consumer_entity()),
            Crud.get(URLs.consumer_catalog())
        ]);
    });

    it('all entities are present in the entity list', function () {
        return Crud.verify_all(URLs.consumer_entity(), [
            { id: 'country' },
            { id: 'heritage-site' }
        ]);
    });


});
