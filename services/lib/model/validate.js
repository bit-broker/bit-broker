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

const schema = require('jsonschema').validate; // specifically NOT json-schema
const locales = require('../locales.js');
const fs = require('fs');

// --- constants - loaded once at startup

const SCHEMA_SLUG = JSON.parse(fs.readFileSync(`${__dirname}/validation/slug.json`));
const SCHEMA_ENTITY = JSON.parse(fs.readFileSync(`${__dirname}/validation/entity.json`));
const SCHEMA_CONNECTOR = JSON.parse(fs.readFileSync(`${__dirname}/validation/connector.json`));
const SCHEMA_POLICY = JSON.parse(fs.readFileSync(`${__dirname}/validation/policy.json`));

// --- validate class (exported)

module.exports = class Validate {

    // --- validation constants - if you change any of these, remember to update the test harness too

    static get ID_FORMAT() { return '^[a-z0-9][a-z0-9-]+$'; }
    static get ID_LENGTH() { return 36; }
    static get SESSION_ACTIONS() { return ['upsert', 'delete']; }
    static get SESSION_COMMITS() { return ['true', 'false']; }
    static get SESSION_MODES() { return ['accrue', 'stream', 'replace']; }

    // --- checks a document against a schema and gathers human readable error messages

    scheme(scheme, instance, name = '') {
        let errs = schema(scheme, instance).errors;
        let msgs = [];

        for (let i = 0; i < errs.length; i++) {
            msgs.push(errs[i].stack.replace(/^instance[\.]?/, name).trim());
        }

        return msgs;
    }

    // --- validates a slug

    slug(item) {
        return this.scheme(item, SCHEMA_SLUG, 'slug');
    }

    // --- validates entity properties

    entity(properties) {
        return this.scheme(properties, SCHEMA_ENTITY);
    }

    // --- validates connector properties

    connector(properties) {
        return this.scheme(properties, SCHEMA_CONNECTOR);
    }

    // --- validates policy properties

    policy(properties) {
        return this.scheme(properties, SCHEMA_POLICY);
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
