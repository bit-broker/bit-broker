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
Provides parameter validation for all bit-broker services.
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const Validator = require('jsonschema').Validator; // specifically NOT json-schema
const Query = require('./query.js');
const failure = require('../errors.js');
const locales = require('../locales.js');
const moment = require('moment');
const fs = require('fs');
const util = require('util');

// --- scheme list

const SCHEMES = [ 'id', 'guid', 'slug', 'string', 'name', 'description', 'date', 'entity', 'connector', 'session', 'policy', 'user', 'userid', 'user_addendum', 'paging', 'records', 'timeseries' ]; // we name them here, rather than just iterate the directory

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

    scheme(instance, scheme, property = '', bbk = true) {
        if (bbk) {
            scheme = { '$ref': `bbk://${ scheme }` }; // standard bbk scheme reference
        }

        let errs = this.schema.validate(instance, scheme).errors;
        let msgs = [];

        for (let i = 0; i < errs.length; i++) {
            let reason = errs[i].message;
            let name = errs[i].property.replace(/^instance[\.]?/, property).replace(/\[\d+\]/, '');
            let match = errs[i].property.match(/^instance\[(\d+)\]/);
            let index = match && match.length && match.length > 1 ? parseInt(match[1]) : null; // first matching group or null

            msgs.push(failure.response(name, reason, isNaN(index) ? null : index));
        }

        return msgs;
    }

    // --- item validators

    action(item) { return this.scheme(item, 'session#/action', 'action'); }
    commit(item) { return this.scheme(item, 'session#/commit', 'commit'); }
    id(item) { return this.scheme(item, 'id', 'id'); }
    guid(item) { return this.scheme(item, 'guid', 'id'); }
    paging(item) {return this.scheme(item, 'paging'); }
    mode(item) { return this.scheme(item, 'session#/mode', 'mode'); }
    name(item) { return this.scheme(item, 'name', 'name'); }
    slug(item) { return this.scheme(item, 'slug', 'slug'); }
    user_id(item) { return this.scheme(item, 'userid', 'user id'); }

    // --- complex property validators

    connector(properties) { return this.scheme(properties, 'connector'); }
    policy(properties) { return this.scheme(properties, 'policy'); }
    user(properties) { return this.scheme(properties, 'user'); }
    user_addendum(properties) { return this.scheme(properties, 'user_addendum', 'addendum'); }
    entity(properties) {
        let errors = this.scheme(properties, 'entity');

        if (!this.is_valid_json_schema(properties.schema)) {
             errors.push(failure.response('schema', locales.__('error.entity-invalid-schema')));
        }

        return errors;
    }

    // --- record validators

    records_delete(records) { return this.scheme(records, 'records#/delete', 'records'); }
    records_upsert(records) { return this.scheme(records, 'records#/upsert', 'records'); }
    records_entity(records, scheme) {
        let schema = {
            type: 'array',
            items: {
                type: 'object',
                properties: { entity: scheme }
            }
        };  // scheme applies to all entity properties of all records in the array

        return this.scheme(records, schema, 'records', false);
    }

    // --- timeseries validators

    timeseries_paging(options) {
        let errors = this.scheme(options, 'timeseries#/paging');
        let valid_start = options.start && moment(options.start, moment.ISO_8601).isValid();
        let valid_end = options.end && moment(options.end, moment.ISO_8601).isValid();

        if (options.start && !valid_start) {
            errors.push(failure.response('start', locales.__('error.not-valid-date')));
        }

        if (options.end && !valid_end) {
            errors.push(failure.response('end', locales.__('error.not-valid-date')));
        }

        if (options.end && !options.start)  // an end without a start
        {
            errors.push(failure.response('paging', locales.__('error.ts-end-without-start')));
        }

        if (options.duration && !options.start)  // a duration without a start
        {
            errors.push(failure.response('paging', locales.__('error.ts-duration-without-start')));
        }

        if (options.end && options.duration)  // where both an end and duration are supplied
        {
            errors.push(failure.response('paging', locales.__('error.ts-end-with-duration')));
        }

        if (valid_start && valid_end && moment(options.end).isSameOrBefore(options.start))  // where end is at or before the start
        {
            errors.push(failure.response('paging', locales.__('error.ts-end-at-or-before-start')));
        }

        return errors;
    }

    // --- validates a data segment query

    query(item) {
        let error = null;  // assume the worst

        if (this.is_valid_json(item)) {
            if (Query.scoped(item)) {
                let q = Query.process(JSON.parse(item));

                if (q.valid === false || q.where.match(/"\$\w+"/) !== null) { // valid queries should no longer contain any '$xxx' style keys
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
