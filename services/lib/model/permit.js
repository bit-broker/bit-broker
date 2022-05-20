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
Provides opaquely generated of IDs and keys, of which components should make
no assumptions other than their type and length.
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const CONST = require('../constants.js');
const crypto = require('crypto');
const fetch = require('node-fetch');

// --- one-time operations

process.env.AUTH_SERVICE = process.env.AUTH_SERVICE.replace(/\/*$/g, ''); // clean-up service url on start-up - no trailing slashes

// --- session class (exported)

module.exports = class Permit {

    // --- generates a unique session id

    static get SESSION_ID() {
        return crypto.randomUUID();
    }

    // --- generates a unique set id

    static get SET_ID() {
        return crypto.randomUUID();
    }

    // --- generates a unique contribution id

    static contribution_id(entity_slug, connector_slug) {
        return crypto.createHash('sha1').update(`${ entity_slug }:${ connector_slug }:${ process.env.APP_SECRET }`).digest('hex');
    }

    // --- generates a public key from a connector id and a vendor id

    static public_key(connector_id, vendor_id) {
        return crypto.createHash('sha1').update(`${ connector_id }:${ vendor_id }`).digest('hex');
    }

    // --- obtains an access token and a key_id from the auth-service

    static generate_token(role, context) {
        return fetch(process.env.AUTH_SERVICE + '/token', {
            method: 'POST',
            body: JSON.stringify({ scope: role, aud: context }),
            headers: CONST.FETCH.HEADERS,
            timeout: CONST.FETCH.TIMEOUT
        })
        .then(res => res.json());
    }

    // --- revokes a list of key_ids and hence their assocaited access tokens

    static revoke_tokens(key_ids) {
        return fetch(process.env.AUTH_SERVICE + '/token', {
            method: 'DELETE',
            body: JSON.stringify(key_ids),
            headers: CONST.FETCH.HEADERS,
            timeout: CONST.FETCH.TIMEOUT
        });
    }
}
