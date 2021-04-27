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

  The catalog model abstraction.

  NOTE: All model methods assume that parameters have been validated and any
  required presence check has been completed by the controller.

  NOTE: Never use strings manipulation via knex.raw, as this will introduce
  SQL injection vulnerabilities. Also use either native knex methods or knex
  raw bindings.

*/

'use strict'; // code assumes ECMAScript 6

// --- catalog class (exported)

module.exports = class Catalog {

    // --- class constructor

    constructor(db) {
        this.db = db;
    }

    // --- select column list

    get COLUMNS() {
        return [
            'catalog.id',
            'catalog.public_id',
            'catalog.vendor_id',
            'catalog.name',
            'entity.name as entity_name',
            'catalog.record',
            'catalog.created_at',
            'catalog.updated_at'
        ];
    }

    // --- table read context

    get rows() {
        return this.db('catalog')
        .select(this.COLUMNS)
        .join('connector', 'connector.id', 'catalog.connector_id')
        .join('entity', 'entity.id', 'connector.entity_id');
    }

    // --- list of entity instances for a given entity type

    list(type) {
        return this.rows.where({ 'entity.name': type });
    }

    // --- upserts a new catalog record

    upsert(values) {
        let merge = { name: values.name, record: values.record }; // only these are merged on update
        return this.rows.insert(values).onConflict(['connector_id', 'vendor_id']).merge(merge).then(result => result.rowCount > 0);
    }

    // --- deletes an existing catalog record

    delete(connector_id, vendor_id) {
        return this.rows.where({ connector_id, vendor_id }).delete().then(result => result.rowCount > 0);
    }
}
