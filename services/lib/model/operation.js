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

const CONST = require('../constants.js');
const Permit = require('./permit.js');
const Catalog = require('./catalog.js');

// --- operation class (exported)

module.exports = class Operation {

    // --- class constructor

    constructor(db, id, connector) {
        this.db = db;
        this.id = id;
        this.set_id = Permit.SET_ID;  // generates a new and unique set id
        this.connector = connector;
    }

    // --- operations read context

    rows(within_set = false) {
        let query = this.db('operation').where({ session_id: this.id });
        if (within_set) query.andWhere({ set_id: this.set_id });
        return query.orderBy('id'); // order it VERY important for operations
    }

    // --- stores operations associated with the given records in the given session

    insert(action, records) {
        let values = [];
        let keys = {};

        for (let i = 0; i < records.length; i++) {
            let record = records[i];
            let vendor_key = action === CONST.ACTION.UPSERT ? record.id : record;
            let public_key = Permit.public_key(this.connector.contribution_id, vendor_key);

            keys[vendor_key] = public_key;

            if (action === CONST.ACTION.UPSERT) {
                record.type = this.connector.entity_slug;
            } else {
                record = { id: record };  // for delete we convert the string to a json as the db field must be a json object
            }

            values.push({
                session_id: this.id,
                set_id: this.set_id,
                public_id: public_key,
                action: action,
                record: record
            });
        }

        let write = values.length ? this.rows().insert(values).then(result => result.rowCount > 0) : Promise.resolve(true);
        return write.then (() => keys);
    }

    // --- deletes operations associated with the given session

    delete(within_set) {
        return this.rows(within_set).delete().then(result => result.rowCount > 0);
    }

    // --- processes operations associated with the given session

    process(wipe, within_set) {

        return this.rows(within_set).then(items => {

            let catalog = new Catalog(this.db);
            let step = wipe ? catalog.wipe(this.connector.id) : Promise.resolve(); // TODO: Add transaction boundaries

            for (let i = 0; i < items.length; i++) {

                step = step.then(() => { // chain the operations in *strict order* and hence never in parrallel

                    if (items[i].action === CONST.ACTION.UPSERT) {
                        return catalog.upsert({
                            connector_id: this.connector.id,
                            public_id: items[i].public_id,
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

    commit(commit, wipe = false, within_set = false) {
        return (commit ? this.process(wipe, within_set) : Promise.resolve(true)).then(result => this.delete(within_set));
    }
}
