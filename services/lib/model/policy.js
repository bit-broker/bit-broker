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
The policy model abstraction.

NOTE: All model methods assume that parameters have been validated and any
required presence check has been completed by the controller.

NOTE: Never use strings manipulation via knex.raw, as this will introduce
SQL injection vulnerabilities. Also use either native knex methods or knex
raw bindings.
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const CONST = require('../constants.js');
const Limiter = require('./limiter.js');
const cloneDeep = require('clone-deep');
const log = require('../logger.js').Logger;

// --- policy class (exported)

module.exports = class Policy {

    // --- class constructor

    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
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
        return this.db('policy').select(this.COLUMNS);
    }

    // --- all policies

    list() {
        return this.rows.orderBy('slug');
    }

    // --- find a policy by slug

    find(slug) {
        return this.rows.where({ slug }).first();
    }

    // --- inserts a new policy

    insert(slug, values) {
        values.slug = slug;

        return this.db.transaction((trx) => {
            return this.rows.transacting(trx).insert(values)
            .then(() => Limiter.upsert(CONST.ROLE.CONSUMER, slug, values.properties.policy.access_control));
        });
    }

    // --- updates an existing policy

    update(slug, values) {
        return this.db.transaction((trx) => {
            return this.find(slug).transacting(trx).update(values)
            .then(() => Limiter.upsert(CONST.ROLE.CONSUMER, slug, values.properties.policy.access_control));
        });
    }

    // --- deletes an existing policy - NO need to delete associated consumer keys, as they will not work now anyway

    delete(slug) {
        return this.db.transaction((trx) => {
            return this.find(slug).transacting(trx).delete()
            .then(() => Limiter.delete(CONST.ROLE.CONSUMER, slug));
        });
    }

    // --- makes a scoped cache key

    cacheKey(slug) {
        return `${ CONST.ROLE.CONSUMER }:${ slug }`;
    }

    // --- read a cache entry (if not found fall back to db query)

    cacheRead(slug) {
        return new Promise((resolve, reject) => {
            this.cache.get(this.cacheKey(slug))
            .then(response => {
                if (response === null) {
                    log.warn('policy', 'cache', 'miss - fallback to db', slug);
                    this.find(slug)
                    .then(item => {
                        if (item === undefined) { // slug not found in database
                            log.warn('policy', 'cache', 'not found in db', slug);
                            resolve(null)
                        } else {
                            // re-populate cache...
                            this.cacheWrite(slug, item.properties.policy)
                            .then(() => resolve(item.properties.policy))
                        }
                    })
                    .catch(error => {
                        reject(error)
                    })
                } else {
                    resolve(JSON.parse(response));
                }
            })
            .catch(error => {
                log.error('policy', 'cache', 'read error - fallback to db', slug, error);
                this.find(slug)
                .then(item => resolve(item.properties.policy))
                .catch(error => {
                    reject(error)
                })
            })
        })
    }

    // --- update a cache entry. Errors here are consumed and logged as they are not fatal for the parent promise chain...

    cacheWrite(slug, policy) {

        // strip out access_control info prior to caching...
        let cachedPolicy = cloneDeep(policy);
        if (cachedPolicy.hasOwnProperty('access_control')) {
            delete cachedPolicy.access_control;
        }
        return new Promise((resolve, reject) => {
            this.cache.set(this.cacheKey(slug), JSON.stringify(cachedPolicy))
            .then(result => {
                if (result !== 'OK') {
                    log.error('policy', 'cache', 'write error', result);
                }
                resolve();
            })
            .catch(error => {
                log.error('policy', 'cache', 'write error', error);
                resolve();
            })
        })
    }

    // --- clear a cache entry. Errors here are consumed and logged as they are not fatal for the parent promise chain...

    cacheClear(slug) {
        return new Promise((resolve, reject) => {
            this.cache.del(this.cacheKey(slug))
            .then(result => {
                if (result !== 1) {
                    log.error('policy', 'cache', 'delete error', result);
                }
                resolve();
            })
            .catch(error => {
                log.error('policy', 'cache', 'delete error', error);
                resolve();
            })
        })
    }

}
