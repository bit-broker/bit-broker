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

const SCHEMES = [ 'id', 'slug', 'name', 'description', 'entity', 'connector', 'session', 'policy', 'user', 'access', 'paging', 'records' ]; // we name them here, rather than just iterate the directory

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
        let valid = true;

        try { JSON.parse(string) }
        catch (error) { valid = false }

        return valid;
    }

    // --- is the given schems is valid json-schema

    is_valid_json_schema(schema) {
        let valid = true;

        try { this.schema.validate({}, schema) }
        catch (error) { valid = false }

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

    // --- item validators

    action(item) { return this.scheme(item, 'session#/action', 'action'); }
    commit(item) { return this.scheme(item, 'session#/commit', 'commit'); }
    id(item) { return this.scheme(item, 'id', 'id'); }
    limit(item) {return this.scheme(item, 'paging#/limit', 'limit'); }
    mode(item) { return this.scheme(item, 'session#/mode', 'mode'); }
    name(item) { return this.scheme(item, 'name', 'name'); }
    offset(item) { return this.scheme(item, 'paging#/offset', 'offset'); }
    slug(item) { return this.scheme(item, 'slug', 'slug'); }

    // --- complex property validators

    access(properties) { return this.scheme(properties, 'access'); }
    connector(properties) { return this.scheme(properties, 'connector'); }
    policy(properties) { return this.scheme(properties, 'policy'); }
    records_delete(properties) { return this.scheme(properties, 'records#/delete'); }
    records_upsert(properties) { return this.scheme(properties, 'records#/upsert'); }
    user(properties) { return this.scheme(properties, 'user'); }
    entity(properties) {
        let errors = this.scheme(properties, 'entity');

        if (!this.is_valid_json_schema(properties.schema)) {
             errors.push(locales.__('error.entity-invalid-schema'));
        }

        return errors;
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
