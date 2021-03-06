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
Shared session test methods
*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const HTTP = require('http-status-codes');
const DATA = require('./data.js');
const Shared = require('./shared.js');  // include first for dotenv
const URLs = require('./urls.js');
const Crud = require('./crud.js');
const chakram = require('chakram');
const expect = chakram.expect;

// --- session test class (exported)

module.exports = class Session {

    // --- opens a new sesson on the given connector

    static open(entity, connector, mode, cb = null) { // this cb should never by async - just stash the info
        return chakram.get(URLs.connector(entity, connector))

        .then(response => {
            expect(response.body).to.be.an('object');
            expect(response.body.contribution_id).to.be.a('string');
            expect(response.body.contribution_id).to.match(new RegExp(DATA.ID.REGEX));
            expect(response.body.contribution_id.length).to.be.eq(DATA.ID.SIZE);
            return response.body.contribution_id;
        })

        .then(cid => {
            return chakram.get(URLs.session_open(cid, mode))

            .then(response => {
                expect(response.body).to.be.a('string');
                expect(response.body).to.match(new RegExp(DATA.GUID.REGEX));
                expect(response.body.length).to.be.eq(DATA.GUID.SIZE);
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

    static action(cid, sid, action, data, page = DATA.RECORDS.MAXIMUM) {
        let actions = Promise.resolve();
        let items = {};

        for (let i = 0 ; i < data.length ; i += page) {
            let start = i;
            let end = Math.min(i + page, data.length);

            actions = actions.then(() => {
                return chakram.post(URLs.session_action(cid, sid, action), data.slice(start, end))
                .then(response => {
                //  if (response.body?.error) console.log(response.body?.error?.message); // debug handy logging
                    expect(response.body).to.be.an('object');
                    items = { ...items,  ...response.body };

                    for (let j = start; j < end; j++) {
                        let key = action === 'upsert' ? data[j].id : data[j];
                        expect(response.body[key]).to.a('string');
                        expect(response.body[key]).to.match(new RegExp(DATA.ID.REGEX));
                        expect(response.body[key].length).to.be.eq(DATA.ID.SIZE);
                    }
                    expect(response).to.have.status(HTTP.OK);
                    return chakram.wait();
                });
            });
        };

        return actions.then(() => items);
    }

    // --- test for a known bad sessions action

    static bad_request(cid, sid, action, data, errors) {
        return Crud.bad_request(URLs.session_action(cid, sid, action), errors, data, chakram.post);
    }

    // --- closes an existing sesson on the given connector

    static close(cid, sid, commit) {
        return chakram.get(URLs.session_close(cid, sid, commit))
        .then(response => {
            expect(response.body).to.be.undefined;
            expect(response).to.have.status(HTTP.OK);
            return chakram.wait();
        });
    }

    // --- an end-to-end open -> action -> close step

    static records(entity, connector, records, mode, action, commit, report) {
        let session = {};

        return Session.open(entity, connector, mode, (info => session = info))

        .then(() => {
            return Session.action(session.cid, session.sid, action, records);
        })

        .then(report => {
            Session.close(session.cid, session.sid, commit);
            return report;
        });
    }
}
