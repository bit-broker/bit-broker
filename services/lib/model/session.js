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

  The connector session model abstraction.

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
const Operation = require('./operation.js');

// --- session class (exported)

module.exports = class Session {

    // --- class constructor

    constructor(db, item) {
        this.db = db;
        this.connector = item.id;
        this.id = item.session_id;
        this.started = item.session_started;
        this.mode = item.session_mode;
        this.operations = new Operation(this.db, this.id, this.connector);
    }

    // --- table read context

    get row() {
        return this.db('connector').where({ id: this.connector }).first();
    }

    // --- writes session data

    write(id, mode) {

        this.id = id;
        this.mode = mode;
        this.started = id ? new Date().toISOString() : null;
        this.operations = new Operation(this.db, this.id, this.connector);

        let values = {
            session_id: this.id,
            session_mode: this.mode,
            session_started: this.started
        };

        return this.row.update(values).then(result => result.rowCount > 0);
    }

    // --- opens a new session

    open(mode) {
        return (this.id ? this.operations.commit(false) : Promise.resolve(true)) // commit false any old open session
        .then(result => this.write(Permit.SESSION_ID, mode));
    }

    // --- processes records on an open session

    process(action, records) {
        return this.operations.insert(action, records)
        .then(result => this.mode === 'stream' ? this.operations.commit(true) : Promise.resolve(result)); // streaming sessions auto commit true on each action
    }

    // --- closes an open session

    close(commit) {
        return this.operations.commit(commit, this.mode === 'replace')
        .then(result => this.write(null, null));
    }
}
