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
The user access model abstraction.

Provides database abstraction for all bit-broker services, who should all
come via this model and never access the database directly.

NOTE: All model methods assume that parameters have been validated and any
required presence check has been completed by the controller.

NOTE: It is assumed that the controller is performing checks on the
existence of the housing user and not relying upon SQL constraint errors.

NOTE: Never use strings manipulation via knex.raw, as this will introduce
SQL injection vulnerabilities. Also use either native knex methods or knex
raw bindings.
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const CONST = require('../constants.js');
const Permit = require('./permit.js');

// --- access class (exported)

module.exports = class Access {

    // --- class constructor

    constructor(db, user = null) {
        this.db = db;
        this.user = user;
    }

    // --- select column list

    get COLUMNS() {
        return [
            'access.id',
            'access.user_id',
            'access.key_id',
            'policy.slug as policy_slug',
            'policy.properties as policy_properties',
            'access.created_at',
            'access.updated_at'
        ];
    }

    // --- table read context

    get read() {
        return this.db('access').select(this.COLUMNS).join('policy', 'policy.id', 'access.policy_id');
    }

    // --- table rows by user context

    get rows() {
        return this.read.where({ user_id: this.user.id });
    }

    // --- all accesss on the instance user

    list() {
        return this.rows.orderBy('id');
    }

    // --- find an access by id on the instance user

    find(id) {
        return this.rows.where({ 'access.id': id }).first();
    }

    // --- find an access by policy_id

    find_by_policy(slug) {
        return this.rows.where({ 'policy.slug': slug }).first();
    }

    // --- inserts a new access on the instance user type

    insert(slug, values) {
        return Permit.generate_token(CONST.ROLE.CONSUMER, slug)
        .then (token => {
            values.key_id = token.jti;
            return this.rows.insert(values).returning('id')
            .then(id => id && id.length ? { token: token.token } : false);
        });
    }

    // --- generates a fresh access token for the given context

    update(slug, values) {
        return Permit.revoke_tokens([values.key_id])
        .then (() => Permit.generate_token(CONST.ROLE.CONSUMER, slug))
        .then (token => {
            return this.find(values.id).update({ key_id: token.jti }).returning('id')
            .then(id => id && id.length ? { token: token.token } : false);
        });
    }

    // --- deletes an access on the instance user type

    delete(item) {
        return Permit.revoke_tokens([item.key_id])
        .then (() => this.find(item.id).delete().then(result => result.rowCount > 0));
    }

    // --- revokes all keys for a given user id

    revoke_by_user(user_id) {
        return this.read.where({ user_id })
        .then(items => items.map(i => i.key_id))
        .then(keys => keys.length ? Permit.revoke_tokens(keys) : Promise.resolve());
    }

    // --- revokes all keys for a given policy

    revoke_by_policy(slug) {
        return this.read.where({ 'policy.slug': slug })
        .then(items => items.map(i => i.key_id))
        .then(keys => keys.length ? Permit.revoke_tokens(keys) : Promise.resolve());
    }
}
