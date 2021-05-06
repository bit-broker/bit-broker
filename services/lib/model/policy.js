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

  The policy model abstraction.

  NOTE: All model methods assume that parameters have been validated and any
  required presence check has been completed by the controller.

  NOTE: Never use strings manipulation via knex.raw, as this will introduce
  SQL injection vulnerabilities. Also use either native knex methods or knex
  raw bindings.

*/

'use strict'; // code assumes ECMAScript 6

// --- policy class (exported)

module.exports = class Policy {

    // --- class constructor

    constructor(db) {
        this.db = db;
    }

    // --- select column list

    get COLUMNS() {
        return [
            'slug',
            'properties',
            'created_at',
            'updated_at'
        ];
    }

    // --- table read context

    get rows() {
        return this.db('policy').select(this.COLUMNS);
    }

    // --- all policies

    list() {
        return this.rows.orderBy('slug');
    }

    // --- find a policy by slug

    find(slug) {
        return this.rows.where({ slug }).first();
    }

    // --- inserts a new policy

    insert(slug, values) {
        values.slug = slug
        return this.rows.insert(values).then(result => result.rowCount > 0);
    }

    // --- updates an existing policy

    update(slug, values) {
        return this.find(slug).update(values).then(result => result.rowCount > 0);
    }

    // --- deletes an existing policy

    delete(slug) {
        return this.find(slug).delete().then(result => result.rowCount > 0);
    }
}
