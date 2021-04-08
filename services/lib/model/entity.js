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
            'name',
            'description',
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
        return this.rows.orderBy('name');
    }

    // --- find an entity type by name

    find(name) {
        return this.rows.where({ name }).first();
    }

    // --- inserts a new entity type

    insert(name, details) {
        details.name = name
        return this.rows.insert(details).then(result => result.rowCount > 0);
    }

    // --- updates an existing entity type

    update(name, details) {
        return this.find(name).update(details).then(result => result.rowCount > 0);
    }

    // --- deletes an existing entity type

    delete(name) {
        return this.find(name).delete().then(result => result.rowCount > 0);
    }

    // --- gets the connector sub-model

    connector(name) {
        return this.find(name).then(item => item ? new Connector(this.db, name) : null);
    }
}
