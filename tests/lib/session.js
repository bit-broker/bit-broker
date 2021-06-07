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

  Shared session test methods

*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const HTTP = require('http-status-codes');
const DATA = require('./data.js');
const Shared = require('./shared.js');
const chakram = require('chakram');
const expect = chakram.expect;

// --- session test class (exported)

module.exports = class Session {

    // --- perform tests with a given connector on an entity type

    static with(entity, connector, cb) {
        return chakram.get(Shared.rest('entity', entity, 'connector', connector))
        .then(response => {
            expect(response.body).to.be.an('object');
            return chakram.wait().then(() => cb(response.body));
        });
    }

    // --- opens a new sesson on the given connector

    static open(entity, connector, mode, cb = null) { // TODO: review use of callback here - if the cb contains other promises then nasty sequencing issues will occur
        return Session.with(entity, connector, (item) => {
            return chakram.get(Shared.rest('connector', item.contribution.id, 'session', 'open', mode))
            .then(response => {
                expect(response.body).to.be.a('string');
                expect(response.body).to.match(new RegExp(DATA.ID.REGEX));
                expect(response.body.length).to.be.eq(DATA.ID.SIZE);
                expect(response).to.have.status(HTTP.OK);
                if (cb) cb(response.body);
                return chakram.wait();
            });
        });
    }

    // --- attempts to open a not known session

    static open_missing(entity, connector, cid) {
        return Session.with(entity, connector, (item) => {
            return chakram.get(Shared.rest('connector', cid, 'session', 'open', 'stream'))
            .then(response => {
                expect(response.body).to.be.a('string');
                expect(response.body.toLowerCase()).to.contain('not found');
                expect(response).to.have.status(HTTP.NOT_FOUND);
                return chakram.wait();
            });
        });
    }

    // --- attempts to open a session with validation errors

    static open_bad(entity, connector, cid, mode, errors) {
        return Session.with(entity, connector, (item) => {
            return chakram.get(Shared.rest('connector', cid || item.contribution.id, 'session', 'open', mode))
            .then(response => {
                expect(response.body).to.be.a('string');
                for (let i = 0; i < errors.length; i++) {
                    for (let j in errors[i]) {
                        expect(response.body).to.contain(j);
                        expect(response.body).to.contain(errors[i][j]);
                    }
                }
                expect(response).to.have.status(HTTP.BAD_REQUEST);
                return chakram.wait();
            });
        });
    }

    // --- actions an data operation within an open session

    static action(entity, connector, sid, action, data) {
        return Session.with(entity, connector, (item) => {
            return chakram.post(Shared.rest('connector', item.contribution.id, 'session', sid, action), data)
            .then(response => {
                expect(response.body).to.be.undefined;
                expect(response).to.have.status(HTTP.NO_CONTENT);
                return chakram.wait();
            });
        });
    }

    // --- attempts to action a data operation with an invalid contribution id

    static action_missing(entity, connector, cid, sid, action, data) {
        return Session.with(entity, connector, (item) => {
            return chakram.post(Shared.rest('connector', cid, 'session', sid, action), data)
            .then(response => {
                expect(response.body).to.be.a('string');
                expect(response.body.toLowerCase()).to.contain('not found');
                expect(response).to.have.status(HTTP.NOT_FOUND);
                return chakram.wait();
            });
        });
    }

    // --- attempts to action a data operation with an invalid session id

    static action_not_auth(entity, connector, sid, action, data) {
        return Session.with(entity, connector, (item) => {
            return chakram.post(Shared.rest('connector', item.contribution.id, 'session', sid, action), data)
            .then(response => {
                expect(response.body).to.be.a('string');
                expect(response.body.toLowerCase()).to.contain('unauthorized');
                expect(response).to.have.status(HTTP.UNAUTHORIZED);
                return chakram.wait();
            });
        });
    }

    // --- attempts to action a data operation with validation errors

    static action_bad(entity, connector, cid, sid, action, data, errors) {
        return Session.with(entity, connector, (item) => {
            return chakram.post(Shared.rest('connector', cid || item.contribution.id, 'session', sid, action), data)
            .then(response => {
                expect(response.body).to.be.a('string');
                for (let i = 0; i < errors.length; i++) {
                    for (let j in errors[i]) {
                        expect(response.body).to.contain(j);
                        expect(response.body).to.contain(errors[i][j]);
                    }
                }
                expect(response).to.have.status(HTTP.BAD_REQUEST);
                return chakram.wait();
            });
        });
    }

    // --- closes an existing sesson on the given connector

    static close(entity, connector, sid, commit) {
        return Session.with(entity, connector, (item) => {
            return chakram.get(Shared.rest('connector', item.contribution.id, 'session', sid, 'close', commit ? 'true' : 'false'))
            .then(response => {
                expect(response.body).to.be.undefined;
                expect(response).to.have.status(HTTP.OK);
                return chakram.wait();
            });
        });
    }

    // --- attempts to close not known session

    static close_missing(entity, connector, cid, sid) {
        return Session.with(entity, connector, (item) => {
            return chakram.get(Shared.rest('connector', cid, 'session', sid, 'close', 'true'))
            .then(response => {
                expect(response.body).to.be.a('string');
                expect(response.body.toLowerCase()).to.contain('not found');
                expect(response).to.have.status(HTTP.NOT_FOUND);
                return chakram.wait();
            });
        });
    }

    // --- attempts to close not known session

    static close_not_auth(entity, connector, sid) {
        return Session.with(entity, connector, (item) => {
            return chakram.get(Shared.rest('connector', item.contribution.id, 'session', sid, 'close', 'true'))
            .then(response => {
                expect(response.body).to.be.a('string');
                expect(response.body.toLowerCase()).to.contain('unauthorized');
                expect(response).to.have.status(HTTP.UNAUTHORIZED);
                return chakram.wait();
            });
        });
    }

    // --- attempts to close a session with validation errors

    static close_bad(entity, connector, cid, sid, commit, errors) {
        return Session.with(entity, connector, (item) => {
            return chakram.get(Shared.rest('connector', cid || item.contribution.id, 'session', sid, 'close', commit))
            .then(response => {
                expect(response.body).to.be.a('string');
                for (let i = 0; i < errors.length; i++) {
                    for (let j in errors[i]) {
                        expect(response.body).to.contain(j);
                        expect(response.body).to.contain(errors[i][j]);
                    }
                }
                expect(response).to.have.status(HTTP.BAD_REQUEST);
                return chakram.wait();
            });
        });
    }

    // --- an end-to-end open -> action -> close step

    static records(entity, connector, records, mode, action, commit) {
        let sid = null;

        return Session.open(entity, connector, mode, (session => sid = session))

        .then (() => {
            return Session.action(entity, connector, sid, action, records)
        })

        .then(() => {
            return Session.close(entity, connector, sid, commit);
        });
    }
}
