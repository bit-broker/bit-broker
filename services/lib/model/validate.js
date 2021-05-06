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

  Provides parameter validation for all bit-broker services.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const Validator = require('jsonschema').Validator; // specifically NOT json-schema
const locales = require('../locales.js');
const fs = require('fs');

// --- scheme listß

const SCHEMES = [ 'slug', 'name', 'description', 'entity', 'connector', 'policy' ]; // we name them here, rather than just iterate the directory

// --- validate class (exported)

module.exports = class Validate {

    // --- consructor

    constructor() {
        this.schema = new Validator();

        for (let i = 0 ; i < SCHEMES.length ; i++) {
            this.schema.addSchema(JSON.parse(fs.readFileSync(`${__dirname}/validation/${ SCHEMES[i] }.json`)), `bbk://${ SCHEMES[i] }`);
        }
    }

    // --- validation constants - if you change any of these, remember to update the test harness too

    static get ID_FORMAT() { return '^[a-z0-9][a-z0-9-]+$'; }
    static get ID_LENGTH() { return 36; }
    static get SESSION_ACTIONS() { return ['upsert', 'delete']; }
    static get SESSION_COMMITS() { return ['true', 'false']; }
    static get SESSION_MODES() { return ['accrue', 'stream', 'replace']; }

    // --- checks a document against a schema and gathers human readable error messages

    scheme(instance, scheme, name = '') {
        let errs = this.schema.validate(instance, { "$ref": `bbk://${ scheme }` }).errors;
        let msgs = [];

        for (let i = 0; i < errs.length; i++) {
            msgs.push(errs[i].stack.replace(/^instance[\.]?/, name).trim());
        }

        return msgs;
    }

    // --- validates a slug

    slug(item) {
        return this.scheme(item, 'slug', 'slug');
    }

    // --- validates entity properties

    entity(properties) {
        return this.scheme(properties, 'entity');
    }

    // --- validates connector properties

    connector(properties) {
        return this.scheme(properties, 'connector');
    }

    // --- validates policy properties

    policy(properties) {
        return this.scheme(properties, 'policy');
    }

    // --- validates a session action

    action(item) {
        let errors = [];

        if (Validate.SESSION_ACTIONS.includes(item) === false) errors.push(locales.__('error.action-invalid', item));

        return errors;
    }

    // --- validates a session commit

    commit(item) {
        let errors = [];

        if (Validate.SESSION_COMMITS.includes(item) === false) errors.push(locales.__('error.commit-invalid', item));

        return errors;
    }

    // --- validates an id

    id(item) {
        let errors = [];

        if (item.length != Validate.ID_LENGTH || new RegExp(Validate.ID_FORMAT).test(item) === false) errors.push(locales.__('error.id-invalid', item));

        return errors;
    }

    // --- validates a session mode

    mode(item) {
        let errors = [];

        if (Validate.SESSION_MODES.includes(item) === false) errors.push(locales.__('error.mode-invalid', item));

        return errors;
    }
}
