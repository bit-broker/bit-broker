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

  The register server test harness - use command 'mocha register'

  WARNING: Running this script will reset the entire database!

*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const HTTP = require('http-status-codes');
const chakram = require('chakram');
const shared = require('./lib/shared.js');
const expect = chakram.expect;

// --- constants

const DATA = require('./lib/data.js');

// --- the test cases

describe('Register Tests', function() {

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
            return shared.up(shared.register);
        });

        it('it responds to an announce request', () => {
            return shared.announce(shared.register, process.env.REGISTER_SERVER_NAME, process.env.REGISTER_SERVER_BASE);
        });

        it('it responds to unknown restful resources', () => {
            return shared.is_bad_route(shared.rest('entity', DATA.name()));
        });

        it('the register is empty', () => {
            return shared.is_clean_slate();
        });
    });

    // --- basic register manipulation tests

    describe('basic register manipulation tests', () => {

        let name = DATA.pick(DATA.NAME.VALID);
        let details1 = { description: DATA.text(DATA.DESCRIPTION.REASONABLE) };
        let details2 = { description: DATA.text(DATA.DESCRIPTION.REASONABLE + 1) };

        before(() => {
            return shared.is_clean_slate();
        });

        after(() => {
            return shared.is_clean_slate();
        });

        it('can add an entity type', () => {
            return chakram.post(shared.rest('entity', name), details1)
            .then(response => {
                expect(response).to.have.status(HTTP.CREATED);
                expect(response).to.have.header('Location', shared.rest('entity', name));
                return chakram.wait();
            });
        });

        it('it is present in the entity type list', () => {
            return chakram.get(shared.rest('entity'))
            .then(response => {
                expect(response).to.have.status(HTTP.OK);
                expect(response.body).to.be.an('array');
                expect(response.body.length).to.be.eq(1);
                expect(response.body[0]).to.be.an('object');
                expect(response.body[0].id).to.be.eq(name);
                expect(response.body[0].url).to.be.eq(shared.rest('entity', name));
                expect(response.body[0].description).to.be.eq(details1.description);
                return chakram.wait();
            });
        });

        it('it is present when addressed directly', () => {
            return chakram.get(shared.rest('entity', name))
            .then(response => {
                expect(response).to.have.status(HTTP.OK);
                expect(response.body).to.be.an('object');
                expect(response.body.id).to.be.eq(name);
                expect(response.body.url).to.be.eq(shared.rest('entity', name));
                expect(response.body.description).to.be.eq(details1.description);
                return chakram.wait();
            });
        });

        it('cannot add a duplicate entity type', () => {
            return chakram.post(shared.rest('entity', name), details1)
            .then(response => {
                expect(response).to.have.status(HTTP.CONFLICT);
                expect(response.body).to.be.undefined;
                return chakram.wait();
            });
        });

        it('can update an entity type', () => {
            return chakram.put(shared.rest('entity', name), details2)
            .then(response => {
                expect(response).to.have.status(HTTP.NO_CONTENT);
                expect(response.body).to.be.undefined;
                return chakram.wait();
            });
        });

        it('new details are present in the entity type list', () => {
            return chakram.get(shared.rest('entity'))
            .then(response => {
                expect(response).to.have.status(HTTP.OK);
                expect(response.body).to.be.an('array');
                expect(response.body.length).to.be.eq(1);
                expect(response.body[0]).to.be.an('object');
                expect(response.body[0].id).to.be.eq(name);
                expect(response.body[0].url).to.be.eq(shared.rest('entity', name));
                expect(response.body[0].description).to.be.eq(details2.description);
                return chakram.wait();
            });
        });

        it('new details are present when addressed directly', () => {
            return chakram.get(shared.rest('entity', name))
            .then(response => {
                expect(response).to.have.status(HTTP.OK);
                expect(response.body).to.be.an('object');
                expect(response.body.id).to.be.eq(name);
                expect(response.body.url).to.be.eq(shared.rest('entity', name));
                expect(response.body.description).to.be.eq(details2.description);
                return chakram.wait();
            });
        });

        it('can delete the entity type', () => {
            return chakram.delete(shared.rest('entity', name))
            .then(response => {
                expect(response).to.have.status(HTTP.NO_CONTENT);
                expect(response.body).to.be.undefined;
                return chakram.wait();
            });
        });

        it('the register is empty', () => {
            return shared.is_clean_slate();
        });

        it('the entity is gone', () => {
            return chakram.get(shared.rest('entity', name))
            .then(response => {
                expect(response).to.have.status(HTTP.NOT_FOUND);
                expect(response.body).to.be.undefined;
                return chakram.wait();
            });
        });

        it('cannot re-delete the entity type', () => {
            return chakram.delete(shared.rest('entity', name))
            .then(response => {
                expect(response).to.have.status(HTTP.NOT_FOUND);
                return chakram.wait();
            });
        });
    });

    // --- register validation tests

    describe('register validation tests', () => {

        function good_name(name, details = null) {
            return chakram.post(shared.rest('entity', name), details || { description: DATA.text(DATA.DESCRIPTION.REASONABLE) })
            .then((response) => {
                expect(response).to.have.status(HTTP.CREATED);
                return chakram.delete(shared.rest('entity', name.toLowerCase().trim()))
                .then((response) => {
                    expect(response).to.have.status(HTTP.NO_CONTENT);
                    return chakram.wait();
                })
            });
        }

        function bad_name(name, type, error, details = null) {
            return chakram.post(shared.rest('entity', name), details || { description: DATA.text(DATA.DESCRIPTION.REASONABLE) })
            .then((response) => {
                expect(response).to.have.status(HTTP.BAD_REQUEST);
                expect(response.body).to.contain(type);
                expect(response.body).to.contain(error);
                return chakram.get(shared.rest('entity', name))
                .then((response) => {
                    expect(response).to.have.status(HTTP.NOT_FOUND);
                    return chakram.wait();
                })
            });
        }

        before(() => {
            return shared.is_clean_slate();
        });

        after(() => {
            return shared.is_clean_slate();
        });

        it('disallows short names', () => {
            return bad_name(DATA.name(DATA.NAME.SHORTEST - 1), 'name', 'too short');
        });

        it('disallows long names', () => {
            return bad_name(DATA.name(DATA.NAME.LONGEST + 1), 'name', 'too long');
        });

        it('disallows various invalid names', () => {
            let tests = [];
            for (let i = 0; i < DATA.NAME.INVALID.length; i++) {
                tests.push(bad_name(DATA.NAME.INVALID[i], 'name', 'invalid format'));
            }
            return Promise.all(tests);
        });

        it('allows shortest name', () => {
            return good_name(DATA.name(DATA.NAME.SHORTEST));
        });

        it('allows longest name', () => {
            return good_name(DATA.name(DATA.NAME.LONGEST));
        });

        it('handles names case independantly', () => {
            let name = DATA.name(DATA.NAME.REASONABLE);
            return good_name(name.toUpperCase());
        });

        it('handles names trimmed of spaces', () => {
            let name = DATA.name(DATA.NAME.REASONABLE);
            return good_name(name.concat('    '));
        });

        it('disallows a missing description', () => {
            return bad_name(DATA.name(DATA.NAME.REASONABLE), 'description', 'too short', {});
        });

        it('disallows an empty description', () => {
            return bad_name(DATA.name(DATA.NAME.REASONABLE), 'description', 'too short', { description: '' });
        });

        it('disallows a long description', () => {
            return bad_name(DATA.name(DATA.NAME.REASONABLE), 'description', 'too long', { description: DATA.text(DATA.DESCRIPTION.LONGEST + 1) });
        });

        it('allows shortest description', () => {
            return good_name(DATA.name(DATA.NAME.REASONABLE), { description: DATA.text(DATA.DESCRIPTION.SHORTEST) });
        });

        it('allows longest description', () => {
            return good_name(DATA.name(DATA.NAME.REASONABLE), { description: DATA.text(DATA.DESCRIPTION.LONGEST) });
        });
    });
});
