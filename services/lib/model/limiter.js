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
Provides access to the API rate limit service.
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const CONST = require('../constants.js');
const fetch = require('node-fetch');

// --- one-time operations

process.env.RATE_SERVICE = process.env.RATE_SERVICE.replace(/\/*$/g, ''); // clean-up service url on start-up - no trailing slashes

// --- limiter class (exported)

module.exports = class Limiter {

    // --- makes the rate limit url

    static url(role, context) {
        return `${ process.env.RATE_SERVICE }/${ role }:${ context }/config`;
    }

    // --- updates or inserts a rate limit config

    static upsert(role, context, properties) {
        return fetch(this.url(role, context), {
            method: 'PUT',
            body: JSON.stringify(properties),
            headers: CONST.FETCH.HEADERS,
            timeout: CONST.FETCH.TIMEOUT
        });
    }

    // --- deletes a rate limit config

    static delete(role, context) {
        return fetch(this.url(role, context), {
            method: 'DELETE',
            headers: CONST.FETCH.HEADERS,
            timeout: CONST.FETCH.TIMEOUT
        });
    }
}
