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

  The consumer test harness - use command 'mocha consumer'

  WARNING: Running this script will reset the entire database!

*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const HTTP = require('http-status-codes');
const DATA = require('./lib/data.js');
const Shared = require('./lib/shared.js');  // include first for dotenv
const URLs = require('./lib/urls.js');
const Crud = require('./lib/crud.js');
const Seeder = require('./lib/seeder.js');
const chakram = require('chakram');
const expect = chakram.expect;

// --- the test cases

describe('Consumer Tests', function() {

    this.timeout(0); // we are not interested in non-functional tests here

    // --- before any tests are run

    before(() => {
        return Shared.before_any();
    });

    // --- after all the tests have been run

    after(() => {
        return Shared.after_all(false);
    });

    // --- start up tests

    describe('start up tests', () => {

        it('the server is up', () => {
            return Shared.up(process.env.CONSUMER_BASE);
        });

        it('it responds to an announce request', () => {
            return Shared.announce(process.env.CONSUMER_BASE, process.env.CONSUMER_NAME);
        });

        it('the database is empty', () => {
            return Shared.empty();
        });
    });

    // --- seed the database

    describe('seed the database', function() {

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
    });

/*

TODO
    api.router.get ('/entity', controller.consumer.types);
    api.router.get ('/entity/:type', controller.consumer.list);
    api.router.get ('/entity/:type/:id', controller.consumer.get);

// -- entity api test
// -- invalid query json tests
*/

    // --- the test cases

    describe('entity api tests', function() {

        // --- test data

        let entities = Seeder.entities;
        let policy = Seeder.policies.find(i => i.slug === DATA.POLICY.ALLAREA.ID);
        let records = {};

        // --- tests a base entity record

        function entity_base(type, record, original) {
            expect(record.id).to.be.a('string');
            expect(record.id).to.match(new RegExp(DATA.PUBLIC_ID.REGEX));
            expect(record.id.length).to.be.eq(DATA.PUBLIC_ID.SIZE);
            expect(record.url).to.be.eq(URLs.consumer_entity(type, record.id));
            expect(record.type).to.be.eq(type);
            expect(record.name).to.be.eq(original.name);

            if (policy.properties.policy.legal_context) {
                expect(record.legal).to.deep.equal(policy.properties.policy.legal_context);
            } else {
                expect(record.legal).to.be.an('array');
                expect(record.legal.length).to.be.eq(0);
            }
        }

        // --- test a full entity record

        function entity_full(type, record, original) {
            entity_base(type, record, original);
            expect(record.entity).to.deep.equal(original.entity);

            if (original.instance) {
                expect(record.instance).to.deep.equal(original.instance);
            } else {
                expect(record.instance).to.be.undefined;
            }
        }

        // --- tests an entity list

        function entity_list(type) {
            records[type] = Seeder.records(type);

            return Crud.get(URLs.consumer_entity(type), (body) => {
                expect(body).to.be.an('array');

                for (let i = 0; i < body.length; i++) {
                    let record = body[i];
                    let original = records[type].find(i => i.name === record.name);

                    expect(original).to.be.an('object');
                    entity_base(type, record, original);

                    original.public_id = record.id;
                }

                expect(body.length).to.be.eq(records[type].length);

                return chakram.wait();
            });
        }

        // --- tests an entity item

        function entity_item(type, id) {
            return Crud.get(URLs.consumer_entity(type, id), (body) => {
                expect(body).to.be.an('object');

                let record = body;
                let original = records[type].find(i => i.name === record.name);

                expect(original).to.be.an('object');
                entity_full(type, record, original);

                return chakram.wait();
            });
        }

        // -- the entity api tests start here

        it('can set the policy header', () => {
            Crud.headers({ 'x-bb-policy': policy.slug }); // we are not testing policy visibility here - that happens in end2end. Here we just test the api is working and returning he right document.
            return true;
        });

        it('the entity types are all present', () => {
            return Crud.verify_all(URLs.consumer_entity(), entities.map(i => {
                return {
                    id: i.slug,
                    url: URLs.consumer_entity(i.slug),
                    name: i.properties.name,
                    description: i.properties.description
                }
            }));
        });

        it('the entity instances are all present in the entity list', () => {
            let tests = [];

            for (let i = 0 ; i < entities.length ; i++) {
                tests.push(entity_list(entities[i].slug));
            }

            return Promise.all(tests);
        });

        it('the entity instances are all present individually', () => {
            let tests = [];

            for (let i = 0 ; i < entities.length ; i++) {
                let type = entities[i].slug;

                for (let j = 0 ; j < records[type].length ; j++) {
                    tests.push(entity_item(type, records[type][j].public_id));
                }
            }

            return Promise.all(tests);
        });
    });

    describe('catalog api tests', function() {

        // --- test data

        const THE_WORLD = Seeder.records('country').map(i => i.name);
        const GEOGRAPHY = Seeder.records('geography');
        const POPULATION = Seeder.records('country').reduce((m, i) => { m[i.id] = i.entity.population; return m; }, {});

        // --- tests a catalog query

        function catalog(test) {
            Crud.headers({ 'x-bb-policy': test.policy || DATA.POLICY.ALLAREA.ID })
            Crud.get(URLs.consumer_catalog(test.query), (body) => {
                expect(body).to.be.an('array');

                let items = body.map(i => i.name);
                test.except = test.except || [];

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

        // -- the catalog api tests start here

        it('0 » nul » empty query', () => {
            return catalog({
                query: {},
                yields: []
            });
        });

        it('1 » str » implicit equal', () => {
            return catalog({
                query: { 'type': 'country', 'name': 'United Kingdom' },
                yields: ['United Kingdom']
            });
        });

        it('0 » str » implicit equal', () => {
            return catalog({
                query: { 'type': 'country', 'name': 'Atlantis' },
                yields: []
            });
        });

        it('M » str » implicit equal'); // TODO

        it('1 » num » implicit equal', () => {
            return catalog({
                query: { 'type': 'country', 'entity.population': POPULATION.GB },
                yields: ['United Kingdom']
            });
        });

        it('0 » num » implicit equal', () => {
            return catalog({
                query: { 'entity.population': 0 },
                yields: []
            });
        });

        it('M » num » implicit equal'); // TODO

        it('1 » str » $eq', () => {
            return catalog({
                query: { 'type': 'country', 'entity.capital': { '$eq': 'London' } },
                yields: ['United Kingdom']
            });
        });

        it('0 » str » $eq', () => {
            return catalog({
                query: { 'type': 'country', 'entity.capital': { '$eq': 'Babylon' } },
                yields: []
            });
        });

        it('M » str » $eq'); // TODO

        it('1 » num » $eq', () => {
            return catalog({
                query: { 'type': 'country', 'entity.population': { '$eq': POPULATION.GB } },
                yields: ['United Kingdom']
            });
        });

        it('M » str » $ne', () => {
            return catalog({
                query: { 'type': 'country', 'entity.capital': { '$ne': 'London' } },
                yields: THE_WORLD,
                except: ['United Kingdom']
            });
        });

        it('M » num » $ne', () => {
            return catalog({
                query: { 'type': 'country', 'entity.population': { '$ne': POPULATION.GB } },
                yields: THE_WORLD,
                except: ['United Kingdom']
            });
        });

        it('M » num » $lt', () => {
            return catalog({
                query: { 'type': 'country', 'entity.population': { '$lt': POPULATION.LI } },
                yields: ['Nauru', 'Palau', 'San Marino', 'Tuvalu', 'Vatican City']
            });
        });

        it('M » num » $lte', () => {
            return catalog({
                query: { 'type': 'country', 'entity.population': { '$lte': POPULATION.LI } },
                yields: ['Liechtenstein', 'Nauru', 'Palau', 'San Marino', 'Tuvalu', 'Vatican City']
            });
        });

        it('M » num » $gt', () => {
            return catalog({
                query: { 'type': 'country', 'entity.population': { '$gt': POPULATION.IN } },
                yields: ['China']
            });
        });

        it('M » num » $gte', () => {
            return catalog({
                query: { 'entity.population': { '$gte': POPULATION.IN } },
                yields: ['China', 'India']
            });
        });

        it('M » str » $lt', () => {
            return catalog({
                query: { 'type': 'country', 'name': { '$lt': 'Argentina' } },
                yields: ['Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda']
            });
        });

        it('M » str » $lt', () => {
            return catalog({
                query: { 'type': 'country', 'name': { '$lte': 'Argentina' } },
                yields: ['Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina']
            });
        });

        it('0 » str » $in', () => {
            return catalog({
                query: { 'type': 'country', 'name': { '$in': ['Atlantis', 'Sparta'] } },
                yields: []
            });
        });

        it('M » str » $in', () => {
            return catalog({
                query: { 'type': 'country', 'name': { '$in': ['United Kingdom', 'Atlantis', 'India', 'France'] } },
                yields: ['United Kingdom', 'India', 'France']
            });
        });

        it('M » str » $nin', () => {
            return catalog({
                query: { 'type': 'country', 'name': { '$nin': ['United Kingdom', 'Atlantis', 'India', 'France'] } },
                yields: THE_WORLD,
                except: ['United Kingdom', 'India', 'France']
            });
        });

        it('M » str » $and', () => {
            return catalog({
                query: { 'type': 'country', '$and': [{ 'name': 'United Kingdom' }, { 'entity.population': POPULATION.GB }] },
                yields: ['United Kingdom']
            });
        });

        it('M » str » $or', () => {
            return catalog({
                query: { 'type': 'country', '$or': [{ 'name': 'United Kingdom' }, { 'entity.population': POPULATION.IN }] },
                yields: ['United Kingdom', 'India']
            });
        });

        it('M » str » $not', () => {
            return catalog({
                query: { 'type': 'country', '$not': { 'name': 'United Kingdom' } },
                yields: THE_WORLD,
                except: ['United Kingdom']
            });
        });

        it('M » str » $not', () => {
            return catalog({
                query: { 'type': 'country', '$nor': [{ 'name': 'United Kingdom' }, { 'entity.population': POPULATION.IN }] },
                yields: THE_WORLD,
                except: ['United Kingdom', 'India']
            });
        });

        it('M » str » regex', () => {
            return catalog({
                query: { 'type': 'country', 'name': { '$regex': 'United .*', '$options': 'i' } },
                yields: ['United Kingdom', 'United States', 'United Arab Emirates']
            });
        });

        it('1 » obj » implicit match', () => {
        /*    return catalog({  TODO
                query: { 'enity.location': GEOGRAPHY.GB },
                yields: ['United Kingdom']
            });*/
        });

        it('M » geo » $near', () => {
            return catalog({
                query: { 'type': 'country', 'entity.location': { '$near': { '$geometry': GEOGRAPHY.BIG_BEN, '$min': 0, '$max': 750000 } } },
                yields: ['United Kingdom', 'Ireland', 'Netherlands']
            });
        });

        it('M » geo » $within', () => {
            return catalog({
                query: { 'type': 'country', 'entity.location': { '$within': { '$geometry': GEOGRAPHY.BRITISH_ISLES } } },
                yields: ['United Kingdom', 'Ireland']
            });
        });

/*        it('M » geo » error type', () => {
            return catalog({
                query: 'FOO',
                yields: []
            });
        });

        it('M » geo » error type', () => {
            return catalog({
                query: [],
                yields: []
            });
        });

        it('M » geo » error invalid', () => {
            return catalog({
                query: { 'type': 'country', '$or': 'FOO' },
                yields: []
            });
        });

        $contains
         */
    });
});
