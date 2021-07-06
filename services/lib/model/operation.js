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

const Permit = require('./permit.js');
const Catalog = require('./catalog.js');

// --- constants

const ACTION_UPSERT = 'upsert';
const ACTION_DELETE = 'delete';

// --- operation class (exported)

module.exports = class Operation {

    // --- class constructor

    constructor(db, id, connector) {
        this.db = db;
        this.id = id;
        this.connector = connector;
    }

    // --- operations read context

    get rows() {
        return this.db('operation').where({ session_id: this.id }).orderBy('id'); // order it VERY important for operations
    }

    // --- stores operations associated with the given records in the given session

    insert(action, records) {
        let values = [];

        for (let i = 0; i < records.length; i++) {
            let record = records[i];

            if (action === ACTION_UPSERT) {
                record.type = this.connector.entity_slug;
            } else {
                record = { id: record };  // for delete we convert the string to a json as the db field must be a json object
            }

            values.push({
                session_id: this.id,
                action: action,
                record: record
            });
        }

        return values.length ? this.rows.insert(values).then(result => result.rowCount > 0) : Promise.resolve(true);
    }

    // --- deletes operations associated with the given session

    delete() {
        return this.rows.delete().then(result => result.rowCount > 0);
    }

    // --- processes operations associated with the given session

    process(wipe = false) {

        return this.rows.then(items => {

            let catalog = new Catalog(this.db);
            let step = wipe ? catalog.wipe(this.connector.id) : Promise.resolve(); // TODO: Add transaction boundaries

            for (let i = 0; i < items.length; i++) {

                step = step.then(() => { // chain the operations in *strict order* and hence never in parrallel

                    if (items[i].action === ACTION_UPSERT) {
                        return catalog.upsert({
                            connector_id: this.connector.id,
                            public_id: Permit.public_key(this.connector.contribution_id, items[i].record.id),
                            vendor_id: items[i].record.id,
                            record: items[i].record
                        });
                    } else {

                        return catalog.delete(this.connector.id, items[i].record.id);
                    }
                });
            }

            return step; // return the last step
        });
    }

    // --- commits or rollbacks pending operations for the session

    commit(commit, wipe = false) {
        return (commit ? this.process(wipe) : Promise.resolve(true)).then(result => this.delete());
    }
}
