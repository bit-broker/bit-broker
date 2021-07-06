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
        let record = { entity: {} };  // mandatory to have this node, even if empty
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
        let properties1 = {...DATA.some_info(), schema: { type: 'integer', maximum: 100, minimum: 0 } };
        let properties2 = {...properties1, schema: { type: 'object', properties: { value: { type: 'string', enum: ['apple', 'banana', 'cantaloupe']}}, required: ['value']}};
        let record = { entity: {} };  // mandatory to have this node, even if empty
        let session = {};

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('can create the housing entity', () => {
            return Crud.add(URLs.entity(entity), properties1, URLs.entity(entity));
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

        it('can post delete data to a session', () => {
            return Session.action(session.cid, session.sid, 'delete', ['789']);
        });

        it('can close the original session', () => {
            return Session.close(session.cid, session.sid, true);
        });

        it('can update the housing entity', () => {
            return Crud.update(URLs.entity(entity), properties2);
        });

        it('can now open a session', () => {
            return Session.open(entity, connector, 'stream', (info => session = info));
        });

        it('can post data to a session', () => {
            return Session.action(session.cid, session.sid, 'upsert', [{ ...record, id: '123', name: 'alice' }, { ...record, id: '456', name: 'bob' }]);
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
});
