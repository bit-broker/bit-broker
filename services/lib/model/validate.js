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
const Query = require('./query.js');
const locales = require('../locales.js');
const fs = require('fs');

// --- scheme list

const SCHEMES = [ 'id', 'slug', 'name', 'description', 'entity', 'connector', 'session', 'policy', 'user' ]; // we name them here, rather than just iterate the directory

// --- validate class (exported)

module.exports = class Validate {

    // --- consructor

    constructor() {
        this.schema = new Validator();

        for (let i = 0 ; i < SCHEMES.length ; i++) {
            this.schema.addSchema(JSON.parse(fs.readFileSync(`${ __dirname }/validation/${ SCHEMES[i] }.json`)), `bbk://${ SCHEMES[i] }`);
        }
    }

    // --- is the given string valid json

    is_valid_json(string) {
        let valid = false;  // assume the worst

        try {
            JSON.parse(string);
            valid = true;
        } catch (err) {
            valid = false;
        }

        return valid;
    }

    // --- checks a document against a schema and gathers human readable error messages

    scheme(instance, scheme, name = '') {
        let errs = this.schema.validate(instance, { "$ref": `bbk://${ scheme }` }).errors;
        let msgs = [];

        for (let i = 0; i < errs.length; i++) {
            msgs.push(errs[i].stack.replace(/^instance[\.]?/, name).trim());
        }

        return msgs;
    }

    // --- validates an id

    id(item) {
        return this.scheme(item, 'id', 'id');
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

    // --- validates a user name

    user_name(item) {
        return this.scheme(item, 'user#/name', 'user name');
    }

    // --- validates an email

    email(item) {
        return this.scheme(item, 'user#/email', 'email');
    }

    // --- validates a session mode

    mode(item) {
        return this.scheme(item, 'session#/mode', 'mode');
    }

    // --- validates a session action

    action(item) {
        return this.scheme(item, 'session#/action', 'action');
    }

    // --- validates a session commit

    commit(item) {
        return this.scheme(item, 'session#/commit', 'commit');
    }

    // --- validates a data segment query

    query(item) {
        let error = null;  // assume the worst

        if (this.is_valid_json(item)) {
            if (Query.scoped(item)) {
                let q = Query.process(JSON.parse(item));

                if (q.valid === false || q.where.match(/"\$\w+"/) !== null) { // valid queries should no longer contain any "$xxx" style keys
                    error = 'cannot-be-parsed';
                }
            } else {
                error = 'has-unrecognised-operations';
            }
        } else {
            error = 'is-not-valid-json';
        }

        return error ? [locales.__(`error.query-${ error }`, item)] : [];
    }
}
