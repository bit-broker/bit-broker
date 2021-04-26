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

  The session operations model abstraction.

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

const Catalog = require('./catalog.js');

// --- operation class (exported)

module.exports = class Operation {

    // --- class constructor

    constructor(db, id) {
        this.db = db;
        this.id = id;
    }

    // --- operations read context

    get rows() {
        return this.db('operation').where({ session_id: this.id }).orderBy('id'); // order it VERY important for operations
    }

    // --- stores operations associated with the given records in the given session

    insert(action, records) {
        let values = [];

        for (let i = 0; i < records.length; i++) {
            values.push({
                session_id: this.id,
                action: action,
                name: records[i].name, // TODO: handle this more fully
                vendor_id: records[i].id,
                record: records[i]
            });
        }

        return values.length ? this.rows.insert(values).then(result => result.rowCount > 0) : Promise.resolve(true);
    }

    // --- deletes operations associated with the given session

    delete() {
        return this.rows.delete().then(result => result.rowCount > 0);
    }

    // --- processes operations associated with the given session

    process() {

        let catalog = new Catalog(this.db);
        let connector = this.db.from('connector').select('id').where({ session_id: this.id }).first(); // this will *not* execute here, but is compounded into the SQL below
        let steps = [];
        let step = Promise.resolve();  // TODO: Add transaction boundaries

        this.rows.then(items => {
            for (let i = 0; i < items.length; i++) {

                step = step.then(() => { // chain the operations in strict order and never in parrallel

                    if (items[i].action === 'upsert') {
                        return catalog.upsert({
                            connector_id: connector,
                            vendor_id: items[i].vendor_id,
                            name: items[i].name,
                            record: items[i].record
                        });
                    } else {
                        return catalog.delete(connector, items[i].vendor_id);
                    }
                });

                steps.push(step);
            }
        });

        return Promise.all(steps); // TODO can just wait for last
    }

    // --- commits or rollbacks pending operations for the session

    commit(commit) {
        return (commit ? this.process() : Promise.resolve(true)).then(result => this.delete());
    }
}
