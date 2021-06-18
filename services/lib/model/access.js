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

// --- access class (exported)

module.exports = class Access {

    // --- class constructor

    constructor(db, user) {
        this.db = db;
        this.user = user;
    }

    // --- select column list

    get COLUMNS() {
        return [
            'id',
            'user_id',
            'key_id',
            'scope',
            'context',
            'created_at',
            'updated_at'
        ];
    }

    // --- table rows by user context

    get rows() {
        return this.db('access').select(this.COLUMNS).where({ user_id: this.user.id });
    }

    // --- all accesss on the instance user

    list() {
        return this.rows.orderBy('id');
    }

    // --- find a access by id on the instance user

    find(id) {
        return this.rows.where({ id }).first();
    }

    // --- inserts a new access on the instance user type

    insert(values) {
        values.user_id = this.user.id;
        return this.rows.insert(values).returning('id').then((id) => id && id.length ? id[0] : 0);
    }

    // --- deletes an access on the instance user type

    delete(id) {
        return this.rows.where({ id }).delete().then(result => result.rowCount > 0);
    }
}
