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

  The entity model abstraction.

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

const Connector = require('./connector.js');

// --- entity class (exported)

module.exports = class Entity {

    // --- class constructor

    constructor(db) {
        this.db = db;
    }

    // --- select column list

    get COLUMNS() {
        return [
            'id',
            'slug',
            'properties',
            'created_at',
            'updated_at'
        ];
    }

    // --- table read context

    get rows() {
        return this.db('entity').select(this.COLUMNS);
    }

    // --- all entity types

    list() {
        return this.rows.orderBy('slug');
    }

    // --- find an entity type by slug

    find(slug) {
        return this.rows.where({ slug }).first();
    }

    // --- inserts a new entity type

    insert(slug, values) {
        values.slug = slug;
        return this.rows.insert(values).then(result => result.rowCount > 0);
    }

    // --- updates an existing entity type

    update(slug, values) {
        return this.find(slug).update(values).then(result => result.rowCount > 0);
    }

    // --- deletes an existing entity type - NO need to delete associated connector keys, as they will not work now anyway

    delete(slug) {
        return this.find(slug).delete().then(result => result.rowCount > 0);
    }

    // --- gets the connector sub-model

    connector(slug) {
        return this.find(slug).then(item => item ? new Connector(this.db, item) : null);
    }
}
