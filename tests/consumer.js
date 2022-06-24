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
const moment = require('moment');
const url = require('url');
const chakram = require('chakram');
const expect = chakram.expect;

// --- the test cases

describe('Consumer Tests', function() {

    this.timeout(0); // we are not interested in non-functional tests here

    // --- test wide variables

    let insertions = []; // will be filled in by seeder adding data

    // --- before any tests are run

    before(() => {
        return Shared.before_any()
        .then (() => {
            DATA.WEBHOOK.server = Seeder.start_webhook();
        });
    });

    // --- after all the tests have been run

    after(() => {
        return Shared.after_all()
        .then (() => {
            DATA.WEBHOOK.server.stop();
        });
    });

    // --- helper to test validation of paging parameters

    function paging_validation(base, paramed = false) {
        let sep = paramed ? '&' : '?';
        return Promise.resolve()
        .then (() => Crud.bad_request(`${ base }${ sep }limit=abc`, [{ limit: DATA.ERRORS.TYPE }]))
        .then (() => Crud.bad_request(`${ base }${ sep }limit=-1`, [{ limit: DATA.ERRORS.SMALL }]))
        .then (() => Crud.bad_request(`${ base }${ sep }limit=0`, [{ limit: DATA.ERRORS.SMALL }]))
        .then (() => Crud.bad_request(`${ base }${ sep }limit=1.2`, [{ limit: DATA.ERRORS.TYPE }]))
        .then (() => Crud.bad_request(`${ base }${ sep }limit=.2`, [{ limit: DATA.ERRORS.TYPE }]))
        .then (() => Crud.bad_request(`${ base }${ sep }limit=1000`, [{ limit: DATA.ERRORS.BIG }]))
        .then (() => Crud.bad_request(`${ base }${ sep }offset=abc`, [{ offset: DATA.ERRORS.TYPE }]))
        .then (() => Crud.bad_request(`${ base }${ sep }offset=-1`, [{ offset: DATA.ERRORS.SMALL }]))
        .then (() => Crud.bad_request(`${ base }${ sep }offset=1.2`, [{ offset: DATA.ERRORS.TYPE }]))
        .then (() => Crud.bad_request(`${ base }${ sep }offset=.2`, [{ offset: DATA.ERRORS.TYPE }]))
        .then (() => Crud.bad_request(`${ base }${ sep }limit=abc&offset=-1`, [{ limit: DATA.ERRORS.TYPE }, { offset: DATA.ERRORS.SMALL }]));
    }

    // --- start up tests

    describe('start up tests', () => {

        it('the server is up', () => {
            return Shared.up(process.env.TESTS_CONSUMER);
        });

        it('it responds to an announce request', () => {
            return Shared.announce(process.env.TESTS_CONSUMER, 'consumer');
        });

        it('the database is empty', () => {
            return Shared.empty();
        });

        it('the webhook server is up', () => {
            return Crud.get(DATA.WEBHOOK.URL, body => {
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
            return Seeder.add_seed_data().then(report => {
                 insertions = report;  // store for later test cases
            });
        });

        it('create the policies', () => {
            return Seeder.add_policies();
        });
    });

    /*

    NOTE: Much more extensive testing of the entity api is done in the
          end2end test. This test is just to check the basic mechanics of
          the process. In end2end we test every combination in detail.

    */

    // --- the test cases

    describe('entity api tests', function() {

        // --- test data

        let entities = Seeder.entities;
        let policy = Seeder.policies.find(i => i.slug === DATA.POLICY.ALLAREA.ID);
        let records = {};
        let page_url = URLs.consumer_entity('heritage-site'); // should return greater than paging list max
        let page_first = null; // will be filled out during tests

        // --- tests a base entity record

        function entity_base(type, fetched, original) {
            expect(fetched.id).to.be.a('string');
            expect(fetched.id).to.match(new RegExp(DATA.ID.REGEX));
            expect(fetched.id.length).to.be.eq(DATA.ID.SIZE);
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
                let extras = Seeder.cb_entity(type, vendor_id);
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

            let act = Promise.resolve();
            let base = URLs.consumer_entity(type);
            let pages = records[type].length / DATA.PAGING.LIST;
            let found = 0;

            for (let i = 0 ; i < pages; i++) {
                act = act.then(() => Crud.get(`${ base }?offset=${ i * DATA.PAGING.LIST }`, body => {
                    expect(body).to.be.an('array');

                    for (let j = 0; j < body.length; j++) {
                        let fetched = body[j];
                        let original = records[type].find(j => j.name === fetched.name);

                        expect(original).to.be.an('object');
                        entity_base(type, fetched, original);

                        original.public_id = fetched.id;  // store this id for later use
                        found++;
                    }
                }));
            }

            act = act.then(() => {
                expect(found).to.be.eq(records[type].length);
            });

            return act;
        }

        // --- tests an entity item

        function entity_item(type, id) {
            let acts = [];

            return Crud.get(URLs.consumer_entity(type, id), body => {
                expect(body).to.be.an('object');

                let fetched = body;
                let original = records[type].find(i => i.name === fetched.name);

                expect(original).to.be.an('object');
                let bbk = entity_full(type, fetched, original);

                for (let i = 0 ; i < bbk.length ; i++) {
                    acts.push (Crud.get(bbk[i].url, linked => {
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

        it('can set access all areas policy', () => {
            Crud.headers(Shared.policy_header(DATA.POLICY.ALLAREA.ID));
        });

        it('can page entity type', () => {
            return Crud.get(`${ URLs.consumer_entity() }?limit=1$offset=1`, items => {
                expect(items).to.be.an('array');
                expect(items.length).to.be.eq(1);
                return chakram.wait();
            });
        });

        it('can get default entity instance page size', () => {
            return Crud.get(page_url, items => {
                expect(items).to.be.an('array');
                expect(items.length).to.be.eq(DATA.PAGING.LIST);
                page_first = items; // will be used by later tests for verification
                return chakram.wait();
            });
        });

        it('can page entity instance via limit as per default', () => {
            return Crud.get(`${ page_url }?limit=${ DATA.PAGING.LIST }`, items => {
                expect(items).to.be.an('array');
                expect(items.length).to.be.eq(DATA.PAGING.LIST);

                let found = items.map(i => i.id).join();
                let expected = page_first.map(i => i.id).join();
                expect(found).to.be.eq(expected); // same list in same order too

                return chakram.wait();
            });
        });

        it('can page entity instance via limit', () => {
            let limit = 10;
            return Crud.get(`${ page_url }?limit=${ limit }`, items => {
                expect(items).to.be.an('array');
                expect(items.length).to.be.eq(limit);

                let found = items.map(i => i.id).join();
                let expected = page_first.slice(0, limit).map(i => i.id).join();
                expect(found).to.be.eq(expected); // same list in same order too

                return chakram.wait();
            });
        });

        it('can page entity instance via offset', () => {
            let offset = 12;
            return Crud.get(`${ page_url }?offset=${ offset }`, items => {
                expect(items).to.be.an('array');
                expect(items.length).to.be.eq(DATA.PAGING.LIST);

                let found = items.slice(0, DATA.PAGING.LIST - offset).map(i => i.id).join(); // exclude the page two which crept in
                let expected = page_first.slice(offset).map(i => i.id).join();
                expect(found).to.be.eq(expected); // same list in same order too

                return chakram.wait();
            });
        });

        it('can page entity instance via limit and offset', () => {
            let limit = 23;
            let offset = 18;  // don't venture into second page here
            return Crud.get(`${ page_url }?limit=${ limit }&offset=${ offset }`, items => {
                expect(items).to.be.an('array');
                expect(items.length).to.be.eq(limit);

                let found = items.map(i => i.id).join();
                let expected = page_first.slice(offset, offset + limit).map(i => i.id).join();
                expect(found).to.be.eq(expected); // same list in same order too

                return chakram.wait();
            });

        });

        it('can page entity instance via excessive offset', () => {
            let offset = 1500;
            return Crud.get(`${ page_url }?offset=${ offset }`, items => {
                expect(items).to.be.an('array');
                expect(items.length).to.be.eq(0);
                return chakram.wait();
            });
        });

        it('cannot use various invalid entity type paging parameter combinations', () => {
            return paging_validation(URLs.consumer_entity());
        });

        it('cannot use various invalid entity instance paging parameter combinations', () => {
            return paging_validation(URLs.consumer_entity('country'));
        });
    });

    describe('timeseries api tests', function() {

        // --- test data - will be filled out with fuller objects during tests

        const COUNTRIES = {
            GB: { name: 'United Kingdom', low: 1960, high: 2017 } // can add more countries perhaps one day
        };

        // --- checks a timeseries with paging

        function paged_timeseries(ts_url, times) {
            return Crud.get(ts_url, ts => {
                expect(ts).to.be.an('array');
                expect(ts.length).to.be.eq(times.length);
                expect(ts.map(t => t.from).sort().join()).to.be.eq(times.sort().join()); // complete time array alignment
                return chakram.wait();
            });
        }

        // -- the catalog api tests start here

        it('can set the policy header', () => {
            Crud.headers(Shared.policy_header(DATA.POLICY.ALLAREA.ID))
        });

        it('collect the test country public ids', () => {
            let names = Object.keys(COUNTRIES).map(i => COUNTRIES[i].name);
            return Crud.get(URLs.consumer_catalog({ 'type': 'country', 'name': { '$in': names }}), items => {
                expect(items).to.be.an('array');

                for (let country in COUNTRIES) {
                    let found = items.find(i => i.name === COUNTRIES[country].name);

                    expect(found).to.be.an('object');
                    expect(found.id).to.be.a('string');

                    COUNTRIES[country].item = found;
                    COUNTRIES[country].ts_url = URLs.consumer_timeseries('country', found.id, DATA.TIMESERIES.POPULATION.name);
                }

                return chakram.wait();
            });
        });

        it('can see timeseries on the parent entity', () => {
            return Crud.get(URLs.consumer_entity('country', COUNTRIES.GB.item.id), item => {
                expect(item).to.be.an('object');
                expect(item.timeseries).to.be.an('object');
                expect(item.timeseries[DATA.TIMESERIES.POPULATION.name]).to.be.an('object');

                let ts = item.timeseries[DATA.TIMESERIES.POPULATION.name];
                expect(ts.unit).to.be.a('string');
                expect(ts.unit.length).to.be.gt(0);
                expect(ts.value).to.be.a('string');
                expect(ts.value.length).to.be.gt(0);
                expect(ts.period).to.be.a('string');
                expect(ts.period.length).to.be.gt(0);
                expect(ts.url).to.be.a('string');
                expect(ts.url).to.be.eq(COUNTRIES.GB.ts_url);

                return chakram.wait();
            });
        });

        it('can get a timeseries', () => {
            return Crud.get(COUNTRIES.GB.ts_url, ts => {
                expect(ts).to.be.an('array');
                expect(ts.length).to.be.eq(COUNTRIES.GB.high - COUNTRIES.GB.low + 1);

                for (let i = 0 ; i < ts.length ; i++) {
                    expect(ts[i]).to.be.an('object');
                    expect(ts[i].from).to.match(new RegExp(DATA.TIMESERIES.POPULATION.from));
                    expect(ts[i].value).to.match(new RegExp(DATA.TIMESERIES.POPULATION.value));
                    expect(Object.values(ts[i]).length).to.be.eq(2);
                }

                return chakram.wait();
            });
        });

        it('can get a timeseries with just a start', () => {
            let start = 1970;  // inclusive
            let years = Array.from({ length: COUNTRIES.GB.high - start + 1 }, (x, i) => i + start);
            return paged_timeseries(`${ COUNTRIES.GB.ts_url }?start=${ start }`, years);
        });

        it('can get a timeseries with a start and an end', () => {
            let start = 1970; // inclusive
            let end = 1996; // exclusive
            let years = Array.from({ length: end - start }, (x, i) => i + start);
            return paged_timeseries(`${ COUNTRIES.GB.ts_url }?start=${ start }&end=${ end }`, years);
        });

        it('can get a timeseries with a start and a duration', () => {
            let start = 1973; // inclusive
            let end = 2010; // exclusive
            let duration = moment(end.toString()).unix() - moment(start.toString()).unix();
            let years = Array.from({ length: end - start }, (x, i) => i + start);
            return paged_timeseries(`${ COUNTRIES.GB.ts_url }?start=${ start }&duration=${ duration }`, years);
        });

        it('can get a timeseries with a start and a limit', () => {
            let start = 1982;  // inclusive
            let limit = 15;
            let years = Array.from({ length: limit }, (x, i) => i + start);
            return paged_timeseries(`${ COUNTRIES.GB.ts_url }?start=${ start }&limit=${ limit }`, years);
        });

        it('can get a timeseries with a start, an end and a limit', () => {
            let start = 1970; // inclusive
            let end = 1994; // exclusive
            let limit = 12;
            let years = Array.from({ length: limit }, (x, i) => i + start);
            return paged_timeseries(`${ COUNTRIES.GB.ts_url }?start=${ start }&end=${ end }&limit=${ limit }`, years);
        });

        it('can get a timeseries with a start, a duration and a limit', () => {
            let start = 1970; // inclusive
            let end = 2010; // exclusive
            let limit = 21;
            let duration = moment(end.toString()).unix() - moment(start.toString()).unix();
            let years = Array.from({ length: limit }, (x, i) => i + start);
            return paged_timeseries(`${ COUNTRIES.GB.ts_url }?start=${ start }&duration=${ duration }&limit=${ limit }`, years);
        });

        it('can get a timeseries with a start and an excessive limit', () => {
            let start = 1982;  // inclusive
            let limit = DATA.PAGING.TIMESERIES;
            let years = Array.from({ length: COUNTRIES.GB.high - start + 1 }, (x, i) => i + start);
            return paged_timeseries(`${ COUNTRIES.GB.ts_url }?start=${ start }&limit=${ limit }`, years);
        });

        it('can get a timeseries with a start, an end and an excessive limit', () => {
            let start = 1970; // inclusive
            let end = 1994; // exclusive
            let limit = DATA.PAGING.TIMESERIES;
            let years = Array.from({ length: end - start }, (x, i) => i + start);
            return paged_timeseries(`${ COUNTRIES.GB.ts_url }?start=${ start }&end=${ end }&limit=${ limit }`, years);
        });

        it('can get a timeseries with a start, a duration and an excessive limit', () => {
            let start = 1970; // inclusive
            let end = 2010; // exclusive
            let limit = DATA.PAGING.TIMESERIES;
            let duration = moment(end.toString()).unix() - moment(start.toString()).unix();
            let years = Array.from({ length: end - start }, (x, i) => i + start);
            return paged_timeseries(`${ COUNTRIES.GB.ts_url }?start=${ start }&duration=${ duration }&limit=${ limit }`, years);
        });

        it('can get a timeseries with an excessively early start', () => {
            let start = 1900;  // inclusive
            let years = Array.from({ length: COUNTRIES.GB.high - COUNTRIES.GB.low + 1 }, (x, i) => i + COUNTRIES.GB.low);
            return paged_timeseries(`${ COUNTRIES.GB.ts_url }?start=${ start }`, years);
        });

        it('can get a timeseries with a start and an excessively late end', () => {
            let start = 1970; // inclusive
            let end = 2050; // exclusive
            let years = Array.from({ length: COUNTRIES.GB.high - start + 1 }, (x, i) => i + start);
            return paged_timeseries(`${ COUNTRIES.GB.ts_url }?start=${ start }&end=${ end }`, years);
        });

        it('can get a timeseries with a start and an excessively long duration', () => {
            let start = 1973; // inclusive
            let end = 2042; // exclusive
            let duration = moment(end.toString()).unix() - moment(start.toString()).unix();
            let years = Array.from({ length: COUNTRIES.GB.high - start + 1 }, (x, i) => i + start);
            return paged_timeseries(`${ COUNTRIES.GB.ts_url }?start=${ start }&duration=${ duration }`, years);
        });

        it('cannot get a timeseries that does not exist', () => {
            return Crud.not_found(URLs.consumer_timeseries('country', COUNTRIES.GB.item.id, DATA.pick(DATA.SLUG.VALID)));
        });

        it('cannot get a timeseries with an invalid slug', () => {
            return Crud.not_found(URLs.consumer_timeseries('country', COUNTRIES.GB.item.id, DATA.pick(DATA.SLUG.INVALID)));
        });

        it('cannot use various bad paging parameters', () => {
            return Promise.resolve()
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?start=foo`, [{ start: DATA.ERRORS.FORMAT }, { start: DATA.ERRORS.INVALID }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?start=1970 01 01`, [{ start: DATA.ERRORS.FORMAT }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?start=1970-13-01`, [{ start: DATA.ERRORS.INVALID }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?start=1970-01-01 23:00:00`, [{ start: DATA.ERRORS.FORMAT }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?start=1970-01-01T23:62:00`, [{ start: DATA.ERRORS.INVALID }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?end=foo`, [{ end: DATA.ERRORS.FORMAT }, { end: DATA.ERRORS.INVALID }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?end=1970 01 01`, [{ end: DATA.ERRORS.FORMAT }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?end=1970-13-01`, [{ end: DATA.ERRORS.INVALID }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?end=1970-01-01 23:00:00`, [{ end: DATA.ERRORS.FORMAT }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?end=1970-01-01T23:62:00`, [{ end: DATA.ERRORS.INVALID }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?duration=foo`, [{ duration: DATA.ERRORS.TYPE }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?duration=0`, [{ duration: DATA.ERRORS.SMALL }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?duration=-1`, [{ duration: DATA.ERRORS.SMALL }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?duration=1.25`, [{ duration: DATA.ERRORS.TYPE }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?duration=.25`, [{ duration: DATA.ERRORS.TYPE }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?limit=foo`, [{ limit: DATA.ERRORS.TYPE }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?limit=0`, [{ limit: DATA.ERRORS.SMALL }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?limit=-1`, [{ limit: DATA.ERRORS.SMALL }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?limit=1.25`, [{ limit: DATA.ERRORS.TYPE }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?limit=.25`, [{ limit: DATA.ERRORS.TYPE }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?limit=1000`, [{ limit: DATA.ERRORS.BIG }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?start=foo&end=2017&limit=0`, [{ start: DATA.ERRORS.FORMAT }, { limit: DATA.ERRORS.SMALL }]));
        });

        it('cannot use various invalid paging parameter combinations', () => {
            return Promise.resolve()
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?end=1980`, [{ paging: 'end without a start' }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?duration=86400`, [{ paging: 'duration without a start' }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?end=1980&duration=86400`, [{ paging: 'both an end and a duration' }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?start=1970&end=1970`, [{ paging: 'end which is at or before the start' }]))
            .then (() => Crud.bad_request(`${ COUNTRIES.GB.ts_url }?start=1970&end=1969`, [{ paging: 'end which is at or before the start' }]));
        });
    });

    /*

    NOTE: Much more extensive testing of catalog queries are done in the
          end2end test. This test is just to check the basic mechanics of
          the process. In end2end we test every combination in detail.

    */

    describe('catalog api tests', function() {

        // --- constant test data

        const THE_WORLD = Seeder.records('country').map(i => i.name);
        const GEOGRAPHY = Seeder.records('geography');
        const POPULATION = Seeder.records('country').reduce((m, i) => { m[i.id] = i.entity.population; return m; }, {});
        const CALLING_CODE = Seeder.records('country').reduce((m, i) => { m[i.id] = i.entity.calling_code; return m; }, {});

        // --- test data

        let page_url = URLs.consumer_catalog({ 'type': 'heritage-site' }); // should return greater than paging list max
        let page_first = null; // will be filled out during tests

        // --- tests a catalog query

        function catalog(test) {
            Crud.headers(Shared.policy_header(test.policy || DATA.POLICY.ALLAREA.ID))
            return Crud.get(URLs.consumer_catalog(test.query), body => {
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

        it('str » regex (basic)', () => {
            return catalog({
                query: { 'type': 'country', 'name': { '$regex': '^.*stan$' } },
                yields: ['Afghanistan', 'Kyrgyzstan', 'Kazakhstan', 'Pakistan', 'Tajikistan', 'Turkmenistan', 'Uzbekistan']
            });
        });

        it('str » regex (case insenitive)', () => {
            return catalog({
                query: { 'type': 'country', 'name': { '$regex': 'United .*', '$options': 'i' } },
                yields: ['United Kingdom', 'United States', 'United Arab Emirates']
            });
        });

        it('str » regex (combination)', () => {
            return catalog({
                query: { 'type': 'country', '$or':[ { 'name': { '$regex': '.*stan$' }}, {'entity.capital': { '$regex': '^San\\s' } } ] },
                yields: ['Afghanistan', 'Costa Rica', 'Kyrgyzstan', 'Kazakhstan', 'Pakistan', 'Puerto Rico', 'El Salvador', 'San Marino', 'Tajikistan', 'Turkmenistan', 'Uzbekistan']
            });
        });

        it('geo » $near', () => {
            return catalog({
                query: { 'type': 'country', 'entity.location': { '$near': { '$geometry': GEOGRAPHY.BIG_BEN, '$min': 0, '$max': 750000 } } },
                yields: ['United Kingdom', 'Ireland', 'Netherlands']
            });
        });

        it('geo » $near (alt order 1)', () => {
            return catalog({
                query: { 'type': 'country', 'entity.location': { '$near': { '$min': 0, '$max': 750000, '$geometry': GEOGRAPHY.BIG_BEN } } },
                yields: ['United Kingdom', 'Ireland', 'Netherlands']
            });
        });

        it('geo » $near (alt order 2)', () => {
            return catalog({
                query: { 'type': 'country', 'entity.location': { '$near': { '$max': 750000, '$min': 0, '$geometry': GEOGRAPHY.BIG_BEN } } },
                yields: ['United Kingdom', 'Ireland', 'Netherlands']
            });
        });

        it('geo » $near (min only)', () => {
            return catalog({
                query: { 'type': 'country', 'entity.location': { '$near': { '$geometry': GEOGRAPHY.BIG_BEN, '$min': 750000 } } },
                yields: THE_WORLD,
                except: ['United Kingdom', 'Ireland', 'Netherlands']
            });
        });

        it('geo » $near (max only)', () => {
            return catalog({
                query: { 'type': 'country', 'entity.location': { '$near': { '$geometry': GEOGRAPHY.BIG_BEN, '$max': 500000 } } },
                yields: ['United Kingdom', 'Ireland']
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

        it('can set access all areas policy', () => {
            Crud.headers(Shared.policy_header(DATA.POLICY.ALLAREA.ID));
        });

        it('can get default page size', () => {
            return Crud.get(page_url, items => {
                expect(items).to.be.an('array');
                expect(items.length).to.be.eq(DATA.PAGING.LIST);
                page_first = items; // will be used by later tests for verification
                return chakram.wait();
            });
        });

        it('can page via limit as per default', () => {
            return Crud.get(`${ page_url }&limit=${ DATA.PAGING.LIST }`, items => {
                expect(items).to.be.an('array');
                expect(items.length).to.be.eq(DATA.PAGING.LIST);

                let found = items.map(i => i.id).join();
                let expected = page_first.map(i => i.id).join();
                expect(found).to.be.eq(expected); // same list in same order too

                return chakram.wait();
            });
        });

        it('can page via limit', () => {
            let limit = 10;
            return Crud.get(`${ page_url }&limit=${ limit }`, items => {
                expect(items).to.be.an('array');
                expect(items.length).to.be.eq(limit);

                let found = items.map(i => i.id).join();
                let expected = page_first.slice(0, limit).map(i => i.id).join();
                expect(found).to.be.eq(expected); // same list in same order too

                return chakram.wait();
            });
        });

        it('can page via offset', () => {
            let offset = 12;
            return Crud.get(`${ page_url }&offset=${ offset }`, items => {
                expect(items).to.be.an('array');
                expect(items.length).to.be.eq(DATA.PAGING.LIST);

                let found = items.slice(0, DATA.PAGING.LIST - offset).map(i => i.id).join(); // exclude the page two which crept in
                let expected = page_first.slice(offset).map(i => i.id).join();
                expect(found).to.be.eq(expected); // same list in same order too

                return chakram.wait();
            });
        });

        it('can page via limit and offset', () => {
            let limit = 23;
            let offset = 18;  // don't venture into second page here
            return Crud.get(`${ page_url }&limit=${ limit }&offset=${ offset }`, items => {
                expect(items).to.be.an('array');
                expect(items.length).to.be.eq(limit);

                let found = items.map(i => i.id).join();
                let expected = page_first.slice(offset, offset + limit).map(i => i.id).join();
                expect(found).to.be.eq(expected); // same list in same order too

                return chakram.wait();
            });

        });

        it('can page via excessive offset', () => {
            let offset = 1500;
            return Crud.get(`${ page_url }&offset=${ offset }`, items => {
                expect(items).to.be.an('array');
                expect(items.length).to.be.eq(0);
                return chakram.wait();
            });
        });

        it('cannot use various invalid catalog paging parameter combinations', () => {
            return paging_validation(URLs.consumer_catalog({ 'type': 'country' }), true);
        });

        it('escaped single quotes', () => {
            return catalog({
                query: { 'entity.capital': "Saint George's" },
                yields: ['Grenada']
            });
        });

        it('escaped double quotes', () => {
            return catalog({
                query: { 'entity.capital': "Saint George\"s" },
                yields: []  // basically does not fail
            });
        });
    });

    /*

    NOTE: Much more extensive testing of connector headers is done in the
          end2end test. This test is just to check the basic mechanics of
          the process. In end2end we test every combination in detail.

    */

    describe('catalog connector header tests', function() {

        let item = null; // filled at in first test

        function present(candidate, exists, connectors) {
            let checks = [];
            let found = 0;
            let url = {
                entity: URLs.consumer_entity(candidate.entity, candidate.ids.public),
                catalog: URLs.consumer_catalog({ 'type': candidate.entity, 'name': candidate.name })
            };

            let headers = Shared.policy_header(DATA.POLICY.ALLAREA.ID);
            if (connectors) headers['x-bbk-connectors'] = connectors.join(',');
            Crud.headers(headers);

            checks.push(Crud.exists(url.entity).then(exists => found += exists ? 1 : 0));
            checks.push(Crud.get(url.catalog, body => { found += body.length }));

            return Promise.all(checks)

            .then(() => expect(found).to.be.eq(exists ? 2 : 0)); // i.e. both places or nowhere
        }

        it('prepare the test item', () => {
            item = DATA.pick(insertions);
        });

        it('check the item is present', () => {
            return present(item, true);
        });

        it('make the connector not live', () => {
            return Crud.delete(URLs.connector_live(item.entity, item.connector.slug));
        });

        it('check the item is not present', () => {
            return present(item, false);
        });

        it('check the item is present via connector headers', () => {
            return present(item, true, [ item.connector.id ]);
        });

        it('make the connector live again', () => {
            return Crud.post(URLs.connector_live(item.entity, item.connector.slug));
        });

        it('check the item is present', () => {
            return present(item, true);
        });

        it('check the item is still present via connector headers', () => {
            return present(item, true, [ item.connector.id ]);
        });

        it('check max connector headers', () => {
            let max = [];

            for (let i = 0 ; i < DATA.CATALOG.MAX_CONNECTORS + 1; i++) {
                max.push(crypto.randomUUID());
            }

            return present(item, true, max);
        });

        it('check empty connector headers', () => {
            return present(item, true, []);
        });
    });
});
