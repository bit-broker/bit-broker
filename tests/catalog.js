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
const Shared = require('./lib/shared.js');
const Entity = require('./lib/entity.js');
const Connector = require('./lib/connector.js');
const Session = require('./lib/session.js');
const chakram = require('chakram');
const expect = chakram.expect;

// --- the test cases

describe('Catalog Tests', function() {

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
            return Shared.up(Shared.catalog);
        });

        it('it responds to an announce request', () => {
            return Shared.announce(Shared.catalog, process.env.CATALOG_SERVER_NAME, process.env.CATALOG_SERVER_BASE);
        });

        it('it responds to unknown restful resources', () => {
            return Shared.bad_route(Shared.rest('catalog', DATA.name()));
        });

        it('the database is empty', () => {
            return Shared.empty();
        });
    });

    // --- session open and close tests

    describe('session open and close tests', () => {

        let entity = DATA.pick(DATA.NAME.VALID);
        let connector = DATA.pick(DATA.NAME.VALID);
        let sid = null;

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('can create the housing entity', () => {
            return Entity.add(entity);
        });

        it('can create the housing connector', () => {
            return Connector.add(entity, connector);
        });

        it('can open a session', () => {
            return Session.open(entity, connector, 'stream', ((session_id) => sid = session_id));
        });

        it('can post data to a session', () => {
            return Session.action(entity, connector, sid, 'upsert', []);
        });

        it('can close a session', () => {
            return Session.close(entity, connector, sid, true);
        });

        it('can open a new session', () => {
            return Session.open(entity, connector, 'stream', ((session_id) => sid = session_id));
        });

        it('can post data to a session', () => {
            return Session.action(entity, connector, sid, 'upsert', []);
        });

        it('can open a new session, overwriting previous', () => {
            return Session.open(entity, connector, 'stream', ((session_id) =>
            {
                expect(session_id).to.not.be.eq(sid); // different session id as overwritten
                sid = session_id;
            }));
        });

        it('can post data to a session', () => {
            return Session.action(entity, connector, sid, 'upsert', []);
        });

        it('can close the current session', () => {
            return Session.close(entity, connector, sid, true);
        });

        it('can delete the housing entity', () => {
            return Entity.delete(entity);
        });
    });

    // --- session validation tests

    describe('session validation tests', () => {

        let entity = DATA.pick(DATA.NAME.VALID);
        let connector = DATA.pick(DATA.NAME.VALID);
        let sid = null;

        before(() => {
            return Shared.empty();
        });

        after(() => {
            return Shared.empty();
        });

        it('can create the housing entity', () => {
            return Entity.add(entity);
        });

        it('can create the housing connector', () => {
            return Connector.add(entity, connector);
        });

        it('can now open a session', () => {
            return Session.open(entity, connector, 'stream', ((session_id) => sid = session_id));
        });

        it('cannot open a session with an unknown contribution id', () => {
            return Session.open_missing(entity, connector, DATA.ID.UNKNOWN);
        });

        it('cannot open a session with an invalid contribution id', () => {
            return Session.open_bad(entity, connector, DATA.ID.UNKNOWN + 'X', 'stream', [{ id: 'invalid format'}]);
        });

        it('cannot open a session with an unknown mode', () => {
            let mode = DATA.name();
            return Session.open_bad(entity, connector, null, mode, [{ mode: 'not recognised'}]);
        });

        it('can now open a session', () => {
            return Session.open(entity, connector, 'stream', ((session_id) => sid = session_id));
        });

        it('cannot post data with an unknown contribution id', () => {
            return Session.action_missing(entity, connector, DATA.ID.UNKNOWN, sid, 'upsert', []);
        });

        it('cannot post data with an unknown session id', () => {
            return Session.action_not_auth(entity, connector, DATA.ID.UNKNOWN, 'upsert', []);
        });

        it('cannot post data an invalid contribution id', () => {
            return Session.action_bad(entity, connector, DATA.ID.UNKNOWN + 'X', sid, 'upsert', [], [{ id: 'invalid format'}]);
        });

        it('cannot post data an invalid session id', () => {
            return Session.action_bad(entity, connector, null, DATA.ID.UNKNOWN + 'X', 'upsert', [], [{ id: 'invalid format'}]);
        });

        it('cannot post data with an unknown action', () => {
            let action = DATA.name();
            return Session.action_bad(entity, connector, null, sid, action, [], [{ action: 'not recognised'}]);
        });

        it('cannot close a session with an unknown contribution id', () => {
            return Session.close_missing(entity, connector, DATA.ID.UNKNOWN, sid);
        });

        it('cannot close a session with an unknown session id', () => {
            return Session.close_not_auth(entity, connector, DATA.ID.UNKNOWN);
        });

        it('cannot close a session with an invalid contribution id', () => {
            return Session.close_bad(entity, connector, DATA.ID.UNKNOWN + 'X', sid, 'true', [{ id: 'invalid format'}]);
        });

        it('cannot close a session with an invalid session id', () => {
            return Session.close_bad(entity, connector, null, DATA.ID.UNKNOWN + 'X', 'true', [{ id: 'invalid format'}]);
        });

        it('cannot close a session with an invalid commit mode', () => {
            let commit = DATA.name();
            return Session.close_bad(entity, connector, null, sid, commit, [{ commit: 'not recognised'}]);
        });

        it('can close the original session', () => {
            return Session.close(entity, connector, sid, true);
        });

        it('can delete the housing entity', () => {
            return Entity.delete(entity);
        });
    });
});
