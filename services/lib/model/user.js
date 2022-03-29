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
The user model abstraction.

Provides database abstraction for all bit-broker services, who should all
come via this model and never access the database directly.

NOTE: All model methods assume that parameters have been validated and any
required presence check has been completed by the controller.

NOTE: Never use strings manipulation via knex.raw, as this will introduce
SQL injection vulnerabilities. Also use either native knex methods or knex
raw bindings.
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const Access = require('./access.js');

// --- user class (exported)

module.exports = class User {

    // --- class constructor

    constructor(db) {
        this.db = db;
    }

    // --- select column list

    get COLUMNS() {
        return [
            'id',
            'email',
            'properties',
            'coordinator_key_id',
            this.db.raw("(SELECT ARRAY(SELECT policy.slug FROM access, policy WHERE access.user_id = users.id AND access.policy_id = policy.id)) AS accesses"),
            'created_at',
            'updated_at'
        ];
    }

    // --- table read context

    get rows() {
        return this.db('users').select(this.COLUMNS);
    }

    // --- all users

    list() {
        return this.rows.orderBy('id');
    }

    // --- find an user by id

    find(id) {
        return this.rows.where({ id }).first();
    }

    // --- find an user by email

    find_by_email(email) {
        return this.rows.where({ email }).first();
    }

    // --- inserts a new user

    insert(values) {
        return this.rows.insert(values).returning('id').then(id => id && id.length ? id[0].id : false);
    }

    // --- updates an existing user

    update(id, values) {
        return this.find(id).update(values).then(result => result.rowCount > 0);
    }

    // --- deletes an existing user

    delete(id) {
        return new Access(this.db).revoke_by_user(id)
        .then (() => this.find(id).delete().then(result => result.rowCount > 0));
    }

    // --- gets the access sub-model

    access(id) {
        return this.find(id).then(item => item ? new Access(this.db, item) : null);
    }
}
