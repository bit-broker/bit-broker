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
const Webhook = require('./lib/webhook.js');
const crypto = require('crypto');
const chakram = require('chakram');
const expect = chakram.expect;

// --- the test cases

describe('Consumer Tests', function() {

    this.timeout(0); // we are not interested in non-functional tests here

    // --- callback function to add extra data via a webhook

    function webhook_callback(type, id) {

        /* This function makes a deterministic set of extra data to add via
           the webhook server. It is called by the webhook server and also
           the later end-to-end test, hence it must be deterministic - else
           comparison tests will fail. It always add an extra item to the
           entity object, but it 50/50 adds another extra item to the
           instance object. */

        let record = Seeder.record(type, id);

        let hash1 = crypto.createHash('sha256').update(`${ record.name }`).digest('hex');
        let hash2 = crypto.createHash('sha256').update(`${ type }${ id }`).digest('hex');

        let extra = { entity: { foo: hash1 } };
        if (hash2[0] >= '0' && hash2[0] <= '7') extra.instance = { bar: hash2 };  // fifty fifty chance of including instance data

        return extra;
    }

    // --- before any tests are run

    before(() => {
        return Shared.before_any()
        .then (() => {
            DATA.WEBHOOK.server = new Webhook(DATA.WEBHOOK.URL, DATA.WEBHOOK.NAME, webhook_callback);
            DATA.WEBHOOK.server.start();
        });
    });

    // --- after all the tests have been run

    after(() => {
        return Shared.after_all()
        .then (() => {
            DATA.WEBHOOK.server.stop();
        });
    });

    // --- start up tests

    describe('start up tests', () => {

        it('the server is up', () => {
            return Shared.up(process.env.CONSUMER_BASE);
        });

        it('it responds to an announce request', () => {
            return Shared.announce(process.env.CONSUMER_BASE, 'consumer');
        });

        it('the database is empty', () => {
            return Shared.empty();
        });

        it('the webhook server is up', () => {
            return Crud.get(DATA.WEBHOOK.URL, (body) => {
                expect(body).to.be.an('object');
                expect(body.name).to.be.eq(DATA.WEBHOOK.NAME);
            });
        });
    });

    // --- seed the database

    describe('seed the database', function() {

        it('create the housing entities', () => {
            return Seeder.add_entities();
        });

        it('create the housing connectors', () => {
            return Seeder.add_connectors(DATA.WEBHOOK.HOOKS.map(i => i = {...i, url: DATA.WEBHOOK.URL }));  // specify webhooks with url
        });

        it('add all the seed data', () => {
            return Seeder.add_seed_data();
        });

        it('create the policies', () => {
            return Seeder.add_policies();
        });
    });

    // --- the test cases

    describe('entity api tests', function() {

        // --- test data

        let entities = Seeder.entities;
        let policy = Seeder.policies.find(i => i.slug === DATA.POLICY.ALLAREA.ID);
        let records = {};

        // --- tests a base entity record

        function entity_base(type, fetched, original) {
            expect(fetched.id).to.be.a('string');
            expect(fetched.id).to.match(new RegExp(DATA.PUBLIC_ID.REGEX));
            expect(fetched.id.length).to.be.eq(DATA.PUBLIC_ID.SIZE);
            expect(fetched.url).to.be.eq(URLs.consumer_entity(type, fetched.id));
            expect(fetched.type).to.be.eq(type);
            expect(fetched.name).to.be.eq(original.name);

            if (policy.properties.policy.legal_context) {
                expect(fetched.legal).to.deep.equal(policy.properties.policy.legal_context);
            } else {
                expect(fetched.legal).to.be.an('array');
                expect(fetched.legal.length).to.be.eq(0);
            }
        }

        // --- tests each property of an object

        function entity_each(type, vendor_id, fetched, original, entity) {
            let bbk = [];

            // everything in original should also be in fetched - deffering bbk links

            for (let i in original) {
                if (typeof original[i] === 'string' && original[i].startsWith('bbk://')) {
                    bbk.push({ bbk: original[i], url: fetched[i] });  // deferred for later testing
                } else {
                    expect(fetched[i]).to.deep.equal(original[i]);
                }
            }

            if (DATA.WEBHOOK.HOOKS.find(i => i.entity === type)) {  // this entity type has webhook added items
                let extras = webhook_callback(type, vendor_id);
                let extra = extras[entity ? 'entity' : 'instance'];

                // extra things within fetched which are not present in original, must be webhook items

                for (let i in fetched) {
                    if (!original || !original.hasOwnProperty(i)) {
                        expect(fetched[i]).to.deep.equal(extra[i]);
                    }
                }

                // now in reverse - all webhook items should be present within fetched

                for (let i in extra) {
                    expect(extra[i]).to.deep.equal(fetched[i]);
                }
            } else {

                // all fetched items should be on the original - i.e. no webhook items

                for (let i in fetched) {
                    expect(original.hasOwnProperty(i)).to.be.eq(true);
                }
            }

            return bbk;
        }

        // --- test a full entity record

        function entity_full(type, fetched, original) {
            let bbk = [];
            let vendor_id = records[type].find(i => i.name === fetched.name).id;

            entity_base(type, fetched, original);
            bbk = bbk.concat(entity_each(type, vendor_id, fetched.entity, original.entity, true));
            bbk = bbk.concat(entity_each(type, vendor_id, fetched.instance, original.instance, false));

            return bbk;
        }

        // --- tests an entity list

        function entity_list(type) {
            records[type] = Seeder.records(type);

            return Crud.get(URLs.consumer_entity(type), (body) => {
                expect(body).to.be.an('array');

                for (let i = 0; i < body.length; i++) {
                    let fetched = body[i];
                    let original = records[type].find(i => i.name === fetched.name);

                    expect(original).to.be.an('object');
                    entity_base(type, fetched, original);

                    original.public_id = fetched.id;  // store this id for later use
                }

                expect(body.length).to.be.eq(records[type].length);

                return chakram.wait();
            });
        }

        // --- tests an entity item

        function entity_item(type, id) {
            let acts = [];

            return Crud.get(URLs.consumer_entity(type, id), (body) => {
                expect(body).to.be.an('object');

                let fetched = body;
                let original = records[type].find(i => i.name === fetched.name);

                expect(original).to.be.an('object');
                let bbk = entity_full(type, fetched, original);

                for (let i = 0 ; i < bbk.length ; i++) {
                    acts.push (Crud.get(bbk[i].url, (linked) => {
                        let parts = bbk[i].bbk.split('/');
                        expect(linked).to.be.an('object');
                        expect(linked.type).to.be.eq(parts[2]);  // no other general expectations we can test other than entity type
                    }));
                }

                return chakram.wait();
            })

            .then(() => Promise.all(acts));
        }

        // -- the entity api tests start here

        it('can set the policy header', () => {
            Crud.headers(Shared.policy_header(policy.slug)); // we are not testing policy visibility here - that happens in end2end. Here we just test the api is working and returning he right document.
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

        it('performing deep inspection tests - expect a delay here...', () => {
            return true; // a message about the next slow test only
        });

        it('the entity instances are all present individually', () => {
            let test = Promise.resolve();

            for (let i = 0 ; i < entities.length ; i++) {
                let type = entities[i].slug;

                for (let j = 0 ; j < records[type].length ; j++) {
                    test = test.then(() => entity_item(type, records[type][j].public_id));
                }
            }

            return test;
        });
    });

    describe('catalog api tests', function() {

        // --- test data

        const THE_WORLD = Seeder.records('country').map(i => i.name);
        const GEOGRAPHY = Seeder.records('geography');
        const POPULATION = Seeder.records('country').reduce((m, i) => { m[i.id] = i.entity.population; return m; }, {});
        const CALLING_CODE = Seeder.records('country').reduce((m, i) => { m[i.id] = i.entity.calling_code; return m; }, {});

        // --- tests a catalog query

        function catalog(test) {
            Crud.headers(Shared.policy_header(test.policy || DATA.POLICY.ALLAREA.ID))
            return Crud.get(URLs.consumer_catalog(test.query), (body) => {
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

        it('invalid query', () => {
            return catalog({
                query: { foo: 'bar' },
                yields: []
            });
        });

        it('nul » empty query » 0', () => {
            return catalog({
                query: {},
                yields: []
            });
        });

        it('str » implicit equal » 1', () => {
            return catalog({
                query: { 'type': 'country', 'name': 'United Kingdom' },
                yields: ['United Kingdom']
            });
        });

        it('str » implicit equal » 0', () => {
            return catalog({
                query: { 'type': 'country', 'name': 'Atlantis' },
                yields: []
            });
        });

        it('str » implicit equal » M', () => {
            return catalog({
                query: { 'type': 'country', 'entity.continent': 'Oceania' },
                yields: ['Australia', 'Fiji', 'Federated States of Micronesia', 'Kiribati', 'Marshall Islands', 'Nauru', 'Palestine', 'New Zealand', 'Palau', 'Papua New Guinea', 'Tuvalu', 'Samoa', 'Solomon Islands', 'Tonga', 'Vanuatu']
            });
        });

        it('num » implicit equal » 1', () => {
            return catalog({
                query: { 'type': 'country', 'entity.population': POPULATION.GB },
                yields: ['United Kingdom']
            });
        });

        it('num » implicit equal » 0', () => {
            return catalog({
                query: { 'entity.population': 0 },
                yields: []
            });
        });

        it('num » implicit equal » M', () => {
            return catalog({
                query: { 'entity.calling_code': CALLING_CODE.US },
                yields: ['United States', 'Canada']
            });
        });

        it('str » $eq » 1', () => {
            return catalog({
                query: { 'type': 'country', 'name': {'$eq': 'United Kingdom' }},
                yields: ['United Kingdom']
            });
        });

        it('str » $eq » 0', () => {
            return catalog({
                query: { 'type': 'country', 'name': {'$eq': 'Atlantis' }},
                yields: []
            });
        });

        it('str » $eq » M', () => {
            return catalog({
                query: { 'type': 'country', 'entity.continent': {'$eq': 'Oceania' }},
                yields: ['Australia', 'Fiji', 'Federated States of Micronesia', 'Kiribati', 'Marshall Islands', 'Nauru', 'Palestine', 'New Zealand', 'Palau', 'Papua New Guinea', 'Tuvalu', 'Samoa', 'Solomon Islands', 'Tonga', 'Vanuatu']
            });
        });

        it('num » $eq » 1', () => {
            return catalog({
                query: { 'type': 'country', 'entity.population': {'$eq': POPULATION.GB }},
                yields: ['United Kingdom']
            });
        });

        it('num » $eq » 0', () => {
            return catalog({
                query: { 'entity.population': {'$eq': 0 }},
                yields: []
            });
        });

        it('num » $eq » M', () => {
            return catalog({
                query: { 'entity.calling_code': {'$eq': CALLING_CODE.US }},
                yields: ['United States', 'Canada']
            });
        });

        it('str » $ne', () => {
            return catalog({
                query: { 'type': 'country', 'entity.population': { '$ne': POPULATION.GB } },
                yields: THE_WORLD,
                except: ['United Kingdom']
            });
        });

        it('num » $ne', () => {
            return catalog({
                query: { 'type': 'country', 'entity.calling_code': { '$ne': CALLING_CODE.US } },
                yields: THE_WORLD,
                except: ['United States', 'Canada']
            });
        });

        it('num » $lt', () => {
            return catalog({
                query: { 'type': 'country', 'entity.population': { '$lt': POPULATION.LI } },
                yields: ['Nauru', 'Palau', 'San Marino', 'Tuvalu', 'Vatican City']
            });
        });

        it('num » $lte', () => {
            return catalog({
                query: { 'type': 'country', 'entity.population': { '$lte': POPULATION.LI } },
                yields: ['Liechtenstein', 'Nauru', 'Palau', 'San Marino', 'Tuvalu', 'Vatican City']
            });
        });

        it('num » $gt', () => {
            return catalog({
                query: { 'type': 'country', 'entity.population': { '$gt': POPULATION.IN } },
                yields: ['China']
            });
        });

        it('num » $gte', () => {
            return catalog({
                query: { 'entity.population': { '$gte': POPULATION.IN } },
                yields: ['China', 'India']
            });
        });

        it('str » $lt', () => {
            return catalog({
                query: { 'type': 'country', 'name': { '$lt': 'Argentina' } },
                yields: ['Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda']
            });
        });

        it('str » $lte', () => {
            return catalog({
                query: { 'type': 'country', 'name': { '$lte': 'Argentina' } },
                yields: ['Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina']
            });
        });

        it('str » $in » 0', () => {
            return catalog({
                query: { 'type': 'country', 'name': { '$in': ['Atlantis', 'Sparta'] } },
                yields: []
            });
        });

        it('str » $in » M', () => {
            return catalog({
                query: { 'type': 'country', 'name': { '$in': ['United Kingdom', 'Atlantis', 'India', 'France'] } },
                yields: ['United Kingdom', 'India', 'France']
            });
        });

        it('str » $nin » M', () => {
            return catalog({
                query: { 'type': 'country', 'name': { '$nin': ['United Kingdom', 'Atlantis', 'India', 'France'] } },
                yields: THE_WORLD,
                except: ['United Kingdom', 'India', 'France']
            });
        });

        it('num » $in', () => {
            return catalog({
                query: { 'type': 'country', 'entity.calling_code': { '$in': [CALLING_CODE.US, CALLING_CODE.GB] } },
                yields: ['United Kingdom', 'United States', 'Canada']
            });
        });

        it('num » $nin', () => {
            return catalog({
                query: { 'type': 'country', 'entity.calling_code': { '$nin': [CALLING_CODE.US, CALLING_CODE.GB] } },
                yields: THE_WORLD,
                except: ['United Kingdom', 'United States', 'Canada']
            });
        });

        it('str » $contains » 0', () => {
            return catalog({
                query: { 'type': 'country', 'entity.languages': { '$contains': 'Klingon' }},
                yields: []
            });
        });

/*

        TODO: Issue #62

        it('str » $contains » M', () => {
            return catalog({
                query: { 'type': 'country', 'entity.languages': { '$contains': 'Japanese' }},
                yields: THE_WORLD,
                except: ['Japan', 'United States', 'Brazil']
            });
        });

        it('num » $contains » M', () => {
            return catalog({
                query: { 'type': 'country', 'entity.location.coordinates': { '$contains': GEOGRAPHY.BIG_BEN.coordinates[1] }},
                yields: ['United Kingdom']
            });
        });
*/

        it('str » regex', () => {
            return catalog({
                query: { 'type': 'country', 'name': { '$regex': 'United .*', '$options': 'i' } },
                yields: ['United Kingdom', 'United States', 'United Arab Emirates']
            });
        });

        it('geo » $near', () => {
            return catalog({
                query: { 'type': 'country', 'entity.location': { '$near': { '$geometry': GEOGRAPHY.BIG_BEN, '$min': 0, '$max': 750000 } } },
                yields: ['United Kingdom', 'Ireland', 'Netherlands']
            });
        });

        it('geo » $within', () => {
            return catalog({
                query: { 'type': 'country', 'entity.location': { '$within': { '$geometry': GEOGRAPHY.BRITISH_ISLES } } },
                yields: ['United Kingdom', 'Ireland']
            });
        });

        it('str » $and', () => {
            return catalog({
                query: { 'type': 'country', '$and': [{ 'name': 'United Kingdom' }, { 'entity.population': POPULATION.GB }] },
                yields: ['United Kingdom']
            });
        });

        it('str » $or', () => {
            return catalog({
                query: { 'type': 'country', '$or': [{ 'name': 'United Kingdom' }, { 'entity.population': POPULATION.IN }] },
                yields: ['United Kingdom', 'India']
            });
        });

        it('str » $not', () => {
            return catalog({
                query: { 'type': 'country', '$not': { 'name': 'United Kingdom' } },
                yields: THE_WORLD,
                except: ['United Kingdom']
            });
        });

        it('str » $not', () => {
            return catalog({
                query: { 'type': 'country', '$nor': [{ 'name': 'United Kingdom' }, { 'entity.population': POPULATION.IN }] },
                yields: THE_WORLD,
                except: ['United Kingdom', 'India']
            });
        });

        it('mix » $and', () => {
            return catalog({
                query: { 'type': 'country', '$and': [{ 'name': 'United Kingdom' }, { 'entity.calling_code': CALLING_CODE.GB }] },
                yields: ['United Kingdom']
            });
        });

        it('mix » $or', () => {
            return catalog({
                query: { 'type': 'country', '$or': [{ 'name': 'United Kingdom' }, { 'entity.calling_code': CALLING_CODE.IN }] },
                yields: ['United Kingdom', 'India']
            });
        });
    });
});
