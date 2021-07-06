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

  The catalog server test harness - use command 'mocha register'

  WARNING: Running this script will reset the entire database!

*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const HTTP = require('http-status-codes');
const DATA = require('./lib/data.js');
const Shared = require('./lib/shared.js');  // include first for dotenv
const URLs = require('./lib/urls.js');
const Crud = require('./lib/crud.js');
const Session = require('./lib/session.js');
const chakram = require('chakram');
const expect = chakram.expect;

// --- the test cases

describe('Contributor Tests', function() {

    this.timeout(0); // we are not interested in non-functional tests here

    // --- before any tests are run

    before(() => {
        return Shared.before_any();
    });

    // --- after all the tests have been run

    after(() => {
        return Shared.after_all();
    });

    // --- start up tests

    describe('start up tests', () => {

        it('the server is up', () => {
            return Shared.up(process.env.CONTRIBUTOR_BASE);
        });

        it('it responds to an announce request', () => {
            return Shared.announce(process.env.CONTRIBUTOR_BASE, process.env.CONTRIBUTOR_NAME);
        });

        it('the database is empty', () => {
            return Shared.empty();
        });
    });

    // --- session manipulation tests

    describe('session manipulation tests', () => {
        let entity = DATA.pick(DATA.SLUG.VALID);
        let connector = DATA.pick(DATA.SLUG.VALID);
        let session = {};

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('can create the housing entity', () => {
            return Crud.add(URLs.entity(entity), DATA.some_info(), URLs.entity(entity));
        });

        it('can create the housing connector', () => {
            return Crud.add(URLs.connector(entity, connector), DATA.some_info(), URLs.connector(entity, connector));
        });

        it('can open a session', () => {
            return Session.open(entity, connector, 'stream', (info => session = info));
        });

        it('can post data to a session', () => {
            return Session.action(session.cid, session.sid, 'upsert', []);
        });

        it('can close a session', () => {
            return Session.close(session.cid, session.sid, true);
        });

        it('can open a new session', () => {
            return Session.open(entity, connector, 'stream', (info => session = info));
        });

        it('can post data to a session', () => {
            return Session.action(session.cid, session.sid, 'upsert', []);
        });

        it('can open a new session and overwriting previous', () => {
            return Session.open(entity, connector, 'stream', (info => {
                expect(info.cid).to.be.eq(session.cid);
                expect(info.sid).to.not.be.eq(session.sid); // different session id as overwritten
                session = info;
            }));
        });

        it('can post data to a session', () => {
            return Session.action(session.cid, session.sid, 'upsert', []);
        });

        it('can close the current session', () => {
            return Session.close(session.cid, session.sid, true);
        });

        it('can delete the housing entity', () => {
            return Crud.delete(URLs.entity(entity))
        });
    });

    // --- session validation tests

    describe('session validation tests', () => {

        let entity = DATA.pick(DATA.SLUG.VALID);
        let connector = DATA.pick(DATA.SLUG.VALID);
        let session = {};

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('can create the housing entity', () => {
            return Crud.add(URLs.entity(entity), DATA.some_info(), URLs.entity(entity));
        });

        it('can create the housing connector', () => {
            return Crud.add(URLs.connector(entity, connector), DATA.some_info(), URLs.connector(entity, connector));
        });

        it('cannot open a session with an unknown contribution id', () => {
            return Crud.not_found(URLs.session_open(DATA.ID.UNKNOWN));
        });

        it('cannot open a session with various invalid ids and modes', () => {
            return Promise.resolve()
            .then (() => Crud.bad_request(URLs.session_open('x'), [{ id: DATA.ERRORS.MIN }]))
            .then (() => Crud.bad_request(URLs.session_open(DATA.ID.UNKNOWN + 'x'), [{ id: DATA.ERRORS.MAX }]))
            .then (() => Crud.bad_request(URLs.session_open(DATA.ID.UNKNOWN + 'X'), [{ id: DATA.ERRORS.FORMAT }]))
            .then (() => Crud.bad_request(URLs.session_open(DATA.ID.UNKNOWN, DATA.slug()), [{ mode: DATA.ERRORS.ENUM }]));
        });

        it('can now open a session', () => {
            return Session.open(entity, connector, 'stream', (info => session = info));
        });

        it('cannot post data with an unknown contribution id', () => {
            return Crud.not_found(URLs.session_action(DATA.ID.UNKNOWN, session.sid), [], chakram.post);
        });

        it('cannot post data with an unknown session id', () => {
            return Crud.unauthorized(URLs.session_action(session.cid, DATA.ID.UNKNOWN), [], chakram.post);
        });

        it('cannot post data with various invalid id and actions', () => {
            return Promise.resolve()
            .then (() => Crud.bad_request(URLs.session_action(DATA.ID.UNKNOWN + 'x', session.sid), [{ id: DATA.ERRORS.MAX }], [], chakram.post))
            .then (() => Crud.bad_request(URLs.session_action(session.cid, DATA.ID.UNKNOWN + 'x'), [{ id: DATA.ERRORS.MAX }], [], chakram.post))
            .then (() => Crud.bad_request(URLs.session_action(session.cid, session.sid, DATA.slug()), [{ action: DATA.ERRORS.ENUM }], [], chakram.post));
        });

        it('cannot close a session with an unknown contribution id', () => {
            return Crud.not_found(URLs.session_close(DATA.ID.UNKNOWN, session.sid));
        });

        it('cannot close a session with an unknown session id', () => {
            return Crud.unauthorized(URLs.session_close(session.cid, DATA.ID.UNKNOWN));
        });

        it('cannot close a session with various invalid ids and commits', () => {
            return Promise.resolve()
            .then (() => Crud.bad_request(URLs.session_close(DATA.ID.UNKNOWN + 'x', session.sid), [{ id: DATA.ERRORS.MAX }]))
            .then (() => Crud.bad_request(URLs.session_close(DATA.ID.UNKNOWN + 'X', session.sid), [{ id: DATA.ERRORS.FORMAT }]))
            .then (() => Crud.bad_request(URLs.session_close(session.cid, DATA.ID.UNKNOWN + 'x'), [{ id: DATA.ERRORS.MAX }]))
            .then (() => Crud.bad_request(URLs.session_close(session.cid, DATA.ID.UNKNOWN + 'X'), [{ id: DATA.ERRORS.FORMAT }]))
            .then (() => Crud.bad_request(URLs.rest('connector', session.cid, 'session', session.sid, 'close', DATA.slug()), [{ commit: DATA.ERRORS.ENUM }]));
        });

        it('can close the session', () => {
            return Session.close(session.cid, session.sid, true);
        });

        it('can delete the housing entity', () => {
            return Crud.delete(URLs.entity(entity))
        });
    });

    // --- session basic record tests - see session.js for more extensive testing

    describe('session basic record tests', () => {

        let entity = DATA.pick(DATA.SLUG.VALID);
        let connector = DATA.pick(DATA.SLUG.VALID);
        let record = DATA.record(1);
        let session = {};

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('can create the housing entity', () => {
            return Crud.add(URLs.entity(entity), DATA.some_info(), URLs.entity(entity));
        });

        it('can create the housing connector', () => {
            return Crud.add(URLs.connector(entity, connector), DATA.some_info(), URLs.connector(entity, connector));
        });

        it('can now open a session', () => {
            return Session.open(entity, connector, 'stream', (info => session = info));
        });

        it('can post data to a session', () => {
            return Session.action(session.cid, session.sid, 'upsert', [{ ...record, id: '123', name: 'alice' }, { ...record, id: '456', name: 'bob' }]);
        });

        it('can post new and updated data to a session', () => {
            return Session.action(session.cid, session.sid, 'upsert', [{ ...record, id: '123', name: 'carol' }, { ...record, id: '456', name: 'dave' }, { ...record, id: '789', name: 'eve' }]);
        });

        it('can post delete data to a session', () => {
            return Session.action(session.cid, session.sid, 'delete', ['789']);
        });

        it('can close the original session', () => {
            return Session.close(session.cid, session.sid, true);
        });

        it('can delete the housing entity', () => {
            return Crud.delete(URLs.entity(entity))
        });
    });

    // --- session basic record validation tests

    describe('session basic record validation tests', () => {

        let entity = DATA.pick(DATA.SLUG.VALID);
        let connector = DATA.pick(DATA.SLUG.VALID);
        let properties = DATA.some_info()
        let record = DATA.record(1);
        let schema1 = { type: 'object', properties: { value: { type: 'integer', maximum: 100, minimum: 0 }}};
        let schema2 = { type: 'object', properties: { value: { type: 'string', enum: ['apple', 'banana', 'cantaloupe'] }}, required: ['value'] };
        let schema3 = { type: 'foobar' };  // invalid json schema
        let session = {};

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('can create the housing entity', () => {
            return Crud.add(URLs.entity(entity), { ...properties, schema: schema1 }, URLs.entity(entity));
        });

        it('can create the housing connector', () => {
            return Crud.add(URLs.connector(entity, connector), DATA.some_info(), URLs.connector(entity, connector));
        });

        it('can now open a session', () => {
            return Session.open(entity, connector, 'stream', (info => session = info));
        });

        it('can upsert an empty dataset to a session', () => {
            return Session.action(session.cid, session.sid, 'upsert', []);
        });

        it('cannot upsert non-json dataset to a session', () => {
            let tests = [];

            tests.push(Session.bad(session.cid, session.sid, 'upsert', null, [{ position: DATA.ERRORS.JSON }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', "", [{ position: DATA.ERRORS.JSON }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', "lorem", [{ position: DATA.ERRORS.JSON }]));

            return Promise.all(tests);
        });

        it('cannot upsert non-array dataset to a session', () => {
            let tests = [];

            tests.push(Session.bad(session.cid, session.sid, 'upsert', undefined, [{ records: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', {}, [{ records: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', record, [{ records: DATA.ERRORS.TYPE }]));

            return Promise.all(tests);
        });

        it('cannot upsert more than max records to a session', () => {
            return Session.bad(session.cid, session.sid, 'upsert', Array(DATA.RECORDS.MAXIMUM + 1).fill(record), [{ records: DATA.ERRORS.MAX }]);
        });

        it('cannot upsert records with missing properties to a session', () => {
            let tests = [];

            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ }], [{ id: DATA.ERRORS.REQUIRED }, { name: DATA.ERRORS.REQUIRED }, { entity: DATA.ERRORS.REQUIRED }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ id: "1" }], [{ name: DATA.ERRORS.REQUIRED }, { entity: DATA.ERRORS.REQUIRED }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ id: "1", name: "alice" }], [{ entity: DATA.ERRORS.REQUIRED }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ id: undefined, name: undefined, entity: undefined}], [{ id: DATA.ERRORS.REQUIRED }, { name: DATA.ERRORS.REQUIRED }, { entity: DATA.ERRORS.REQUIRED }]));

            return Promise.all(tests);
        });

        it('cannot upsert records with invalid properties to a session', () => {
            let tests = [];

            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, id: 123}], [{ id: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, id: null}], [{ id: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, id: []}], [{ id: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, id: ""}], [{ id: DATA.ERRORS.MIN }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, id: DATA.text(DATA.RECORDS.ITEM_MAXIMUM + 1)}], [{ id: DATA.ERRORS.MAX }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, name: 123}], [{ name: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, name: null}], [{ name: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, name: []}], [{ name: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, name: ""}], [{ name: DATA.ERRORS.MIN }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, name: DATA.text(DATA.RECORDS.ITEM_MAXIMUM + 1)}], [{ name: DATA.ERRORS.MAX }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, entity: 123}], [{ entity: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, entity: null}], [{ entity: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, entity: []}], [{ entity: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, entity: ""}], [{ entity: DATA.ERRORS.TYPE }]));

            return Promise.all(tests);
        });

        it('can delete an empty dataset to a session', () => {
            return Session.action(session.cid, session.sid, 'delete', []);
        });

        it('cannot delete non-json dataset to a session', () => {
            let tests = [];

            tests.push(Session.bad(session.cid, session.sid, 'delete', null, [{ position: DATA.ERRORS.JSON }]));
            tests.push(Session.bad(session.cid, session.sid, 'delete', "", [{ position: DATA.ERRORS.JSON }]));
            tests.push(Session.bad(session.cid, session.sid, 'delete', "lorem", [{ position: DATA.ERRORS.JSON }]));

            return Promise.all(tests);
        });

        it('cannot delete non-array dataset to a session', () => {
            let tests = [];

            tests.push(Session.bad(session.cid, session.sid, 'delete', undefined, [{ records: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'delete', {}, [{ records: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'delete', record, [{ records: DATA.ERRORS.TYPE }]));

            return Promise.all(tests);
        });

        it('cannot delete more than max records to a session', () => {
            return Session.bad(session.cid, session.sid, 'delete', Array(DATA.RECORDS.MAXIMUM + 1).fill('1'), [{ records: DATA.ERRORS.MAX }]);
        });

        it('cannot delete records with invalid properties to a session', () => {
            let tests = [];

            tests.push(Session.bad(session.cid, session.sid, 'delete', [123], [{ records: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'delete', [null], [{ records: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'delete', [undefined], [{ records: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'delete', [{}], [{ records: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'delete', [[]], [{ records: DATA.ERRORS.TYPE }]));

            return Promise.all(tests);
        });

        it('can post valid entity data to a session', () => {
            let tests = [];

            tests.push(Session.action(session.cid, session.sid, 'upsert', [{ ...record, entity: { value: 0 } }]));
            tests.push(Session.action(session.cid, session.sid, 'upsert', [{ ...record, entity: { value: 50 } }]));
            tests.push(Session.action(session.cid, session.sid, 'upsert', [{ ...record, entity: { value: 100 } }]));

            return Promise.all(tests);
        });

        it('cannot post invalid entity data to a session', () => {
            let tests = [];

            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, entity: { value: -1 } }], [{ records: DATA.ERRORS.SMALL }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, entity: { value: 101 } }], [{ records: DATA.ERRORS.BIG }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, entity: { value: 0.5 } }], [{ records: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, entity: { value: [] } }], [{ records: DATA.ERRORS.TYPE }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, entity: { value: "" } }], [{ records: DATA.ERRORS.TYPE }]));

            return Promise.all(tests);
        });

        it('can close the original session', () => {
            return Session.close(session.cid, session.sid, true);
        });

        it('can update the housing entity with a new entity schema', () => {
            return Crud.update(URLs.entity(entity),  { ...properties, schema: schema2 });
        });

        it('can now open a session', () => {
            return Session.open(entity, connector, 'stream', (info => session = info));
        });

        it('can post valid entity data to a session', () => {
            let tests = [];

            tests.push(Session.action(session.cid, session.sid, 'upsert', [{ ...record, entity: { value: "apple" } }]));
            tests.push(Session.action(session.cid, session.sid, 'upsert', [{ ...record, entity: { value: "banana" } }]));
            tests.push(Session.action(session.cid, session.sid, 'upsert', [{ ...record, entity: { value: "cantaloupe" } }]));

            return Promise.all(tests);
        });

        it('cannot post invalid entity data to a session', () => {
            let tests = [];

            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, entity: { value: "melon" } }], [{ records: DATA.ERRORS.ENUM }]));
            tests.push(Session.bad(session.cid, session.sid, 'upsert', [{ ...record, entity: {} }], [{ records: DATA.ERRORS.REQUIRED }]));

            return Promise.all(tests);
        });

        it('can close the original session', () => {
            return Session.close(session.cid, session.sid, true);
        });

        it('can update the housing entity with an invalid entity schema', () => {
            return Crud.update(URLs.entity(entity),  { ...properties, schema: schema3 });
        });

        it('can now open a session', () => {
            return Session.open(entity, connector, 'stream', (info => session = info));
        });

        it('can post any entity data to a session', () => {
            return Session.action(session.cid, session.sid, 'upsert', [{ ...record, id: '123', name: 'carol' }, { ...record, id: '456', name: 'dave' }, { ...record, id: '789', name: 'eve' }]);
        });

        it('can close the original session', () => {
            return Session.close(session.cid, session.sid, true);
        });

        it('can update the housing entity with an empty entity schema', () => {
            return Crud.update(URLs.entity(entity),  { ...properties, schema: {} });
        });

        it('can now open a session', () => {
            return Session.open(entity, connector, 'stream', (info => session = info));
        });

        it('can post any entity data to a session', () => {
            return Session.action(session.cid, session.sid, 'upsert', [{ ...record, id: '123', name: 'carol' }, { ...record, id: '456', name: 'dave' }, { ...record, id: '789', name: 'eve' }]);
        });

        it('can close the original session', () => {
            return Session.close(session.cid, session.sid, true);
        });

        it('can delete the housing entity', () => {
            return Crud.delete(URLs.entity(entity))
        });
    });
});
