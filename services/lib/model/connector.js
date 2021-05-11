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

  The connector model abstraction.

  Provides database abstraction for all bit-broker services, who should all
  come via this model and never access the database directly.

  NOTE: All model methods assume that parameters have been validated and any
  required presence check has been completed by the controller.

  NOTE: It is assumed that the controller is performing checks on the
  existence of the housing entity and not relying upon SQL constraint errors.

  NOTE: Never use strings manipulation via knex.raw, as this will introduce
  SQL injection vulnerabilities. Also use either native knex methods or knex
  raw bindings.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const Permit = require('./permit.js');
const Session = require('./session.js');

// --- connector class (exported)

module.exports = class Connector {

    // --- class constructor

    constructor(db, entity = null) {
        this.db = db;
        this.entity = entity;
    }

    // --- select column list

    get COLUMNS() {
        return [
            'connector.id',
            'connector.slug',
            'connector.properties',
            'entity.slug as entity_slug',
            'connector.contribution_id',
            'connector.contribution_key',
            'connector.session_id',
            'connector.session_started',
            'connector.session_mode',
            'connector.created_at',
            'connector.updated_at'
        ];
    }

    // --- table read context

    get read() {
        return this.db('connector').select(this.COLUMNS).join('entity', 'entity.id', 'connector.entity_id');
    }

    // --- table rows by entity context

    get rows() {
        return this.read.where({ 'entity.slug': this.entity.slug });
    }

    // --- table write context

    get write() {
        return this.db('connector').where('entity_id', this.db('entity').select('id').where({ 'entity.slug': this.entity.slug }));
    }

    // --- all connectors on the instance entity type

    list() {
        return this.rows.orderBy('connector.slug');
    }

    // --- find a connector by slug on the instance entity type

    find(slug) {
        return this.rows.where({ 'connector.slug': slug }).first();
    }

    // --- inserts a new connector on the instance entity type

    insert(slug, values) {
        values.slug = slug
        values.contribution_id = Permit.CONTRIBUTION_ID;
        values.entity_id = this.db.from('entity').select('id').where({ slug: this.entity.slug }).first(); // this will *not* execute here, but is compounded into the SQL below
        return this.write.insert(values).then(result => result.rowCount > 0);
    }

    // --- updates a connector on the instance entity type

    update(slug, values) {
        return this.write.where({ slug }).update(values).then(result => result.rowCount > 0);
    }

    // --- deletes a connector on the instance entity type

    delete(slug) {
        return this.write.where({ slug }).delete().then(result => result.rowCount > 0);
    }

    // --- gets the session sub-model

    session(contribution_id) {
        return this.read.where({ 'connector.contribution_id': contribution_id }).first().then(item => item ? new Session(this.db, item) : null);
    }
}
