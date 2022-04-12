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
The catalog model abstraction.

Provides database abstraction for all bit-broker services, who should all
come via this model and never access the database directly.

NOTE: All model methods assume that parameters have been validated and any
required presence check has been completed by the controller.

NOTE: Never use strings manipulation via knex.raw, as this will introduce
SQL injection vulnerabilities. Also use either native knex methods or knex
raw bindings.

==========================================================================
            AN IMPORTANT NOTE ON APPLICATION WIDE SECURITY
--------------------------------------------------------------------------

 This is the place that hackers will come to circumvent the policy data
 segment. If you modify this file in any way, please ensure that you pay
 close attention to the security implications of your changes. This is
 especially true of the 'rows' function, which picks rows inside the
 policy data segment only. Do nothing to compromise this selection. Only
 ever add to this via an AND clause and never an OR clause. This is what
 the method 'query' does. Never use bare or raw SQL and instead use the
 functional components which Knex offers. Knex will escape all paramters
 automatically to avoid SQL Injection style attacks.

==========================================================================

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const Query = require('./query.js');

// --- catalog class (exported)

module.exports = class Catalog {

    // --- class constructor

    constructor(db) {
        this.db = db;
    }

    // --- select catalog column list

    get COLUMNS_CATALOG() {
        return [
            'catalog.id',
            'catalog.public_id',
            'catalog.vendor_id',
            'entity.slug as entity_slug',
            'entity.properties as entity_properties',
            'connector.properties as connector_properties',
            'catalog.record',
            'catalog.created_at',
            'catalog.updated_at'
        ];
    }

    // --- select type column list

    get COLUMNS_TYPE() {
        return [
            'entity.slug as entity_slug',
            'entity.properties as entity_properties'
        ];
    }

    // --- table read context - ALL read queries MUST go via this to ensure blanket policy enforcement

    rows(segment, connectors, full = true) {  // ===== SEE VITAL POINT ABOUT SECURITY IN FILE HEADER =====
        return this.db('catalog')
        .select(full ? this.COLUMNS_CATALOG : this.COLUMNS_TYPE)
        .join('connector', 'connector.id', 'catalog.connector_id')
        .join('entity', 'entity.id', 'connector.entity_id')
        .whereRaw(Query.process(segment).where)
        .andWhere(function() {
            this.whereIn('connector.contribution_id', connectors).orWhere('connector.is_live', true);
        });
    }

    // --- table write context

    get write() {
        return this.db('catalog');
    }

    // --- a catalog query

    query(segment, connectors, query) { // ===== SEE VITAL POINT ABOUT SECURITY IN FILE HEADER =====
        let subset = Query.process(query).where;
        if (subset === 'TRUE') subset = 'FALSE';  // by convention, no query = no records on bare catalog calls
        return this.rows(segment, connectors).whereRaw(subset);
    }

    // --- list of entity types

    types(segment, connectors) {
        return this.rows(segment, connectors, false).distinct('entity.slug').orderBy('entity.slug');
    }

    // --- list of entity instances for a given entity type

    list(segment, connectors, type) {
        return this.rows(segment, connectors).where({ 'entity.slug': type });
    }

    // --- find an entity instances by id for a given entity type

    find(segment, connectors, type, id) {
        return this.list(segment, connectors, type).where({ 'catalog.public_id': id }).first();
    }

    // --- upserts a new catalog record

    upsert(values) {
        let merge = { name: values.name, record: values.record }; // only these are merged on update
        return this.write.insert(values).onConflict(['connector_id', 'vendor_id']).merge(merge).then(result => result.rowCount > 0);
    }

    // --- deletes an existing catalog record

    delete(connector_id, vendor_id) {
        return this.write.where({ connector_id, vendor_id }).delete().then(result => result.rowCount > 0);
    }

    // --- deletes all records for the given connector

    wipe(connector_id) {
        return this.write.where({ connector_id }).delete().then(result => result.rowCount > 0);
    }
}
