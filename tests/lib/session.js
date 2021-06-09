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

    // --- opens a new sesson on the given connector

    static open(entity, connector, mode, cb = null) { // this cb should never by async - just stash the info
        return chakram.get(Shared.rest('entity', entity, 'connector', connector))

        .then(response => {
            expect(response.body).to.be.an('object');
            expect(response.body.contribution.id).to.be.a('string');
            expect(response.body.contribution.id).to.match(new RegExp(DATA.ID.REGEX));
            expect(response.body.contribution.id.length).to.be.eq(DATA.ID.SIZE);
            return response.body.contribution.id;
        })

        .then(cid => {
            return chakram.get(Shared.rest('connector', cid, 'session', 'open', mode))

            .then(response => {
                expect(response.body).to.be.a('string');
                expect(response.body).to.match(new RegExp(DATA.ID.REGEX));
                expect(response.body.length).to.be.eq(DATA.ID.SIZE);
                expect(response).to.have.status(HTTP.OK);
                return response.body;
            })

            .then(sid => {
                if (cb) cb({ cid: cid, sid: sid });
                return chakram.wait();
            });
        });
    }

    // --- actions an data operation within an open session

    static action(cid, sid, action, data) {
        return chakram.post(Shared.rest('connector', cid, 'session', sid, action), data)
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.NO_CONTENT);
            return chakram.wait();
        });
    }

    // --- closes an existing sesson on the given connector

    static close(cid, sid, commit) {
        return chakram.get(Shared.rest('connector', cid, 'session', sid, 'close', commit ? 'true' : 'false'))
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- an end-to-end open -> action -> close step

    static records(entity, connector, records, mode, action, commit) {
        let session = {};
        return Session.open(entity, connector, mode, (info => session = info))
        .then(() => { return Session.action(session.cid, session.sid, action, records) })
        .then(() => { return Session.close(session.cid, session.sid, commit); });
    }
}
