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

const chakram = require('chakram');
const shared = require('./lib/shared.js');
const expect = chakram.expect;

// --- constants

const DATA = require('./lib/data.js');

// --- the test cases

describe('Catalog Tests', function() {

    this.timeout(0); // we are not interested in non-functional tests here

    // --- before any tests are run

    before(() => {
        return shared.before_any();
    });

    // --- after all the tests have been run

    after(() => {
        return shared.after_all();
    });

    // --- start up tests

    describe('start up tests', () => {

        it('the server is up', () => {
            return shared.up(shared.catalog);
        });

        it('it responds to an announce request', () => {
            return shared.announce(shared.catalog, process.env.CATALOG_SERVER_NAME, process.env.CATALOG_SERVER_BASE);
        });

        it('it responds to unknown restful resources', () => {
            return shared.is_bad_route(shared.rest('catalog', DATA.name()));
        });

  /*      it('the register is empty', () => {
            return Register.is_empty();
        }); */
    });

/*
    // --- basic connector validation tests

    describe('basic connector validation tests', () => {

        before(() => {
            return shared.clean_slate();
        });

        after(() => {
            return shared.clean_slate();
        });

        it('disallows invalid session open parameters', () => {
            return shared.bad_request(shared.rest('connector', DATA.word(), 'session', 'open', DATA.word()), ['invalid connector id', 'invalid session mode']);
        });

        it('disallows invalid session update parameters', () => {
            return shared.bad_request(shared.rest('connector', DATA.word(), 'session', DATA.word(), DATA.word()), ['invalid connector id', 'invalid session id', 'invalid session action'], chakram.post);
        });

        it('disallows invalid session close parameters', () => {
            return shared.bad_request(shared.rest('connector', DATA.word(), 'session', DATA.word(), 'close', DATA.word()), ['invalid connector id', 'invalid session id', 'invalid session commit']);
        });

        it('disallows various invalid restful routes', () => {
            let tests = [];
            tests.push(shared.bad_route(shared.rest('connector')));
            tests.push(shared.bad_route(shared.rest('connector', DATA.word())));
            tests.push(shared.bad_route(shared.rest('connector', DATA.word(), 'session')));
            tests.push(shared.bad_route(shared.rest('connector', DATA.word(), 'session', 'open')));
            tests.push(shared.bad_route(shared.rest('connector', DATA.word(), DATA.word(), 'open', DATA.word())));
            tests.push(shared.bad_route(shared.rest('connector', DATA.word(), 'session', DATA.word(), 'closed', DATA.word())));
            tests.push(shared.bad_route(shared.rest('connector', DATA.word(), 'session', DATA.word(), 'close')));
            return Promise.all(tests);
        });
    });

    // --- basic open and close session tests

    describe('basic open and close session tests', () => {

        let entity = DATA.ENTITY;
        let connector = DATA.oneof(DATA.CONNECTOR);
        let cid = null; // will be filled in during the tests

        before(() => {
            return shared.clean_slate();
        });

        after(() => {
            return shared.clean_slate();
        });

        function open_close_session(mode, records = [], ack = 200) {
            return chakram.get(shared.rest('connector', cid, 'session', 'open', mode))
            .then((response) => {
                expect(response).to.have.status(200);
                expect(response.body).to.be.a('string');
                expect(response.body.length).to.be.eq(DATA.ID.SIZE);
                expect(response.body).to.match(new RegExp(DATA.ID.REGEX));
                let sid = response.body;

                return chakram.post(shared.rest('connector', cid, 'session', sid, 'upsert'), records)
                .then((response) => {
                    expect(response).to.have.status(ack);

                    if (ack == 200) {
                        expect(response.body).to.be.an('array');
                        expect(response.body.length).to.be.eq(records.length);
                    } else {
                        expect(response.body).to.be.a('string');
                    }

                    return chakram.get(shared.rest('connector', cid, 'session', sid, 'close', 'false'))
                    .then((response) => {
                        expect(response).to.have.status(200);
                        return chakram.wait();
                    });
                });
            });
        }

        it('add the housing entity and connector', () => {
            return chakram.post(shared.rest('register', entity))
            .then((response) => {
                expect(response).to.have.status(201);

                return chakram.post(shared.rest('register', entity, 'connector', connector))
                .then((response) => {
                    expect(response).to.have.status(201);

                    return chakram.get(shared.rest('register', entity, 'connector', connector))
                    .then((response) => {
                        expect(response).to.have.status(200);
                        cid = response.body.id;
                        return chakram.wait();
                    });
                });
            });
        });

        it('can open and close a stream session', () => {
            return open_close_session('stream');
        });

        it('can open and close an accrue session', () => {
            return open_close_session('accrue');
        });

        it('can open and close a replace session', () => {
            return open_close_session('replace');
        });

        it('can post records array into a session', () => {
            return open_close_session('replace', [], 200);
        });

        it('can post empty object into a session', () => {
            return open_close_session('replace', {}, 400);
        });

        it("can't post a string into a session", () => {
            return open_close_session('replace', DATA.word(), 400);
        });

        it("can't post a number into a session", () => {
            return open_close_session('replace', 123, 400);
        });

        it("can't open a session with a unknown connector id", () => {
            return chakram.get(shared.rest('connector', DATA.ID.UNKNOWN, 'session', 'open', 'stream'))
            .then((response) => {
                expect(response).to.have.status(404);
            });
        });

        it("can't post to a unknown connector id", () => {
            return chakram.get(shared.rest('connector', DATA.ID.UNKNOWN, 'session', DATA.ID.UNKNOWN, 'upsert'))
            .then((response) => {
                expect(response).to.have.status(404);
            });
        });

        it("can't close a session with a unknown connector id", () => {
            return chakram.get(shared.rest('connector', DATA.ID.UNKNOWN, 'session', DATA.ID.UNKNOWN, 'close', 'false'))
            .then((response) => {
                expect(response).to.have.status(404);
            });
        });

        it("can't upload to an invalid session id", () => {
            return chakram.post(shared.rest('connector', cid, 'session', DATA.ID.UNKNOWN, 'upsert'), [])
            .then((response) => {
                expect(response).to.have.status(401);
            });
        });

        it("can't close an invalid session id", () => {
            return chakram.get(shared.rest('connector', cid, 'session', DATA.ID.UNKNOWN, 'close', 'false'))
            .then((response) => {
                expect(response).to.have.status(401);
            });
        });

        it('can overwrite a session', () => {
            return chakram.get(shared.rest('connector', cid, 'session', 'open', 'stream'))
            .then((response) => {
                expect(response).to.have.status(200);
                let sid1 = response.body;

                return chakram.get(shared.rest('connector', cid, 'session', 'open', 'stream'))
                .then((response) => {
                    expect(response).to.have.status(200);
                    let sid2 = response.body;

                    return chakram.get(shared.rest('connector', cid, 'session', sid2, 'close', 'false'))
                    .then((response) => {
                        expect(response).to.have.status(200);
                        expect(sid1).to.not.be.eq(sid2);
                        return chakram.wait();
                    });
                });
            });
        });

        it('can delete the housing entity', () => {
            return chakram.delete(shared.rest('register', entity))
            .then((response) => {
                expect(response).to.have.status(200);
                return chakram.wait();
            });
        });
    });

    // --- basic record inserting tests

    describe('basic record inserting tests', () => {

        let entity = DATA.ENTITY;
        let connector = DATA.oneof(DATA.CONNECTOR);
        let rec = DATA.oneof(DATA.RECORDS);
        let cid = null; // will be filled in during the tests

        before(() => {
            return shared.clean_slate();
        });

        after(() => {
            return shared.clean_slate();
        });

        it('add the housing entity and connector', () => {
            return chakram.post(shared.rest('register', entity))
            .then((response) => {
                expect(response).to.have.status(201);

                return chakram.post(shared.rest('register', entity, 'connector', connector))
                .then((response) => {
                    expect(response).to.have.status(201);

                    return chakram.get(shared.rest('register', entity, 'connector', connector))
                    .then((response) => {
                        expect(response).to.have.status(200);
                        cid = response.body.id;
                        return chakram.wait();
                    });
                });
            });
        });

        it('can insert a test record', () => {
            return chakram.get(shared.rest('connector', cid, 'session', 'open', 'stream'))
            .then((response) => {
                expect(response).to.have.status(200);
                let sid = response.body;

                return chakram.post(shared.rest('connector', cid, 'session', sid, 'upsert'), [rec])
                .then((response) => {
                    expect(response).to.have.status(200);
                    expect(response.body).to.be.an('array');
                    expect(response.body.length).to.be.eq(1);
                    expect(response.body[0].id).to.be.eq(rec.id);
                    expect(response.body[0].ack).to.be.an('string');
                    expect(response.body[0].ack.length).to.be.eq(DATA.KEY.SIZE);
                    expect(response.body[0].ack).to.match(new RegExp(DATA.KEY.REGEX));
                    expect(response.body[0].errors).to.be.an('array');
                    expect(response.body[0].errors.length).to.be.eq(0);

                    return chakram.get(shared.rest('connector', cid, 'session', sid, 'close', 'true'))
                    .then((response) => {
                        expect(response).to.have.status(200);
                        return chakram.wait();
                    });
                });
            });
        });

        it('can remove a test record', () => {
            return chakram.get(shared.rest('connector', cid, 'session', 'open', 'stream'))
            .then((response) => {
                expect(response).to.have.status(200);
                let sid = response.body;

                return chakram.post(shared.rest('connector', cid, 'session', sid, 'remove'), [rec.id])
                .then((response) => {
                    expect(response).to.have.status(200);
                    expect(response.body).to.be.an('array');
                    expect(response.body.length).to.be.eq(1);
                    expect(response.body[0].id).to.be.eq(rec.id);
                    expect(response.body[0].ack).to.be.eq(true);
                    expect(response.body[0].errors).to.be.an('array');
                    expect(response.body[0].errors.length).to.be.eq(0);

                    return chakram.get(shared.rest('connector', cid, 'session', sid, 'close', 'true'))
                    .then((response) => {
                        expect(response).to.have.status(200);
                        return chakram.wait();
                    });
                });
            });
        });

        it('can delete the housing entity', () => {
            return chakram.delete(shared.rest('register', entity))
            .then((response) => {
                expect(response).to.have.status(200);
                return chakram.wait();
            });
        });
    });*/
});
