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

    constructor(db, name = null) {
        this.db = db;
        this.entity_name = name;
    }

    // --- select column list

    get COLUMNS() {
        return [
            'connector.name',
            'entity.name as entity_name',
            'connector.description',
            'connector.contribution_id',
            'connector.contribution_key',
            'connector.webhook',
            'connector.cache',
            this.db.raw('CASE WHEN connector.session_id IS NULL THEN false ELSE true END AS in_session'),
            'connector.created_at',
            'connector.updated_at'
        ];
    }

    // --- table read context

    get rows() {
        return this.db('connector').select(this.COLUMNS).join('entity', 'entity.id', 'connector.entity_id').where({ 'entity.name': this.entity_name });
    }

    // --- table write context

    get write() {
        return this.db('connector').where('entity_id', this.db('entity').select('id').where({ name: this.entity_name }));
    }

    // --- all connectors on the instance entity type

    list() {
        return this.rows.orderBy('connector.name');
    }

    // --- find a connector by name on the instance entity type

    find(name) {
        return this.rows.where({ 'connector.name': name }).first();
    }

    // --- inserts a new connector on the instance entity type

    insert(name, values) {
        values.name = name;
        values.webhook = values.webhook.length ? values.webhook : null;
        values.contribution_id = Permit.CONTRIBUTION_ID;
        values.entity_id = this.db.from('entity').select('id').where({ name: this.entity_name }).first(); // this will *not* execute here, but is compounded into the SQL below
        return this.write.insert(values).then(result => result.rowCount > 0);
    }

    // --- updates a connector on the instance entity type

    update(name, values) {
        values.webhook = values.webhook.length ? values.webhook : null;
        return this.write.where({ name }).update(values).then(result => result.rowCount > 0);
    }

    // --- deletes a connector on the instance entity type

    delete(name) {
        return this.write.where({ name }).delete().then(result => result.rowCount > 0);
    }

    // --- gets the session sub-model

    session(contribution_id) {
        return this.db('connector').where({ contribution_id }).first().then(item => item ? new Session(this.db, item) : null);
    }
}
