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

  The policy model abstraction.

  NOTE: All model methods assume that parameters have been validated and any
  required presence check has been completed by the controller.

  NOTE: Never use strings manipulation via knex.raw, as this will introduce
  SQL injection vulnerabilities. Also use either native knex methods or knex
  raw bindings.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const fetch = require('node-fetch');
const cloneDeep = require('clone-deep');
const log = require('../logger.js').Logger;

// --- constants - not .env configurable

const POLICY_CACHE_KEY_PREFIX = 'BBK_DSP_ID_' ;
const FETCH_TIMEOUT = 2000;
const FETCH_HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json'
};

// --- policy class (exported)

module.exports = class Policy {

    // --- class constructor

    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }

    // --- returns the rate limit url for a given slug

    static rate_limiter(slug) {
        return `${ process.env.RATE_LIMIT_BASE }/${ slug }/config`;
    }

    // --- select column list

    get COLUMNS() {
        return [
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

        return this.db.transaction(function(trx) {
            return trx
            .insert(values)
            .into('policy')
            .then(() => fetch(Policy.rate_limiter(slug), {
                method: 'put',
                headers: FETCH_HEADERS,
                body: JSON.stringify(values.properties.policy.access_control),
                timeout: FETCH_TIMEOUT
            }))
            .then(result => result.rowCount > 0);
        });
    }

    // --- updates an existing policy

    update(slug, values) {
        return this.db.transaction(function(trx) {
            return trx
            .select('*')
            .from('policy')
            .where({ slug }).first()
            .update(values)
            .then(() => fetch(Policy.rate_limiter(slug), {
                method: 'put',
                headers: FETCH_HEADERS,
                body: JSON.stringify(values.properties.policy.access_control),
                timeout: FETCH_TIMEOUT
            }))
            .then(result => result.rowCount > 0);
        });
    }

    // --- deletes an existing policy

    delete(slug) {
        return this.db.transaction(function(trx) {
            return trx
            .select('*')
            .from('policy')
            .where({ slug }).first()
            .delete()
            .then(() => fetch(Policy.rate_limiter(slug), {
                method: 'delete',
                headers: FETCH_HEADERS,
                timeout: FETCH_TIMEOUT
            }))
            .then(result => result.rowCount > 0);
        });
    }

    // --- read a cache entry (if not found fall back to db query)

    cacheRead(slug) {
        return new Promise((resolve, reject) => {
            let key = POLICY_CACHE_KEY_PREFIX + slug;
            this.cache.get(key)
            .then(response => {
                if (response === null) {
                    log.error('cache miss; fall back to db query for slug: ' + slug)
                    this.find(slug)
                    .then(item => {
                        if (item === undefined) { // slug not found in database
                            log.error('slug not found in db: ' + slug)
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
                log.error('cache read error; fall back db query for slug: ' + slug, error)
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
            this.cache.set(POLICY_CACHE_KEY_PREFIX + slug, JSON.stringify(cachedPolicy))
            .then(result => {
                if (result !== 'OK') {
                    log.error('cache write error', result)
                }
                resolve();
            })
            .catch(error => {
                log.error('cache write error', error)
                resolve();
            })
        })
    }

    // --- clear a cache entry. Errors here are consumed and logged as they are not fatal for the parent promise chain...

    cacheClear(slug) {
        return new Promise((resolve, reject) => {
            this.cache.del(POLICY_CACHE_KEY_PREFIX + slug)
            .then(result => {
                if (result !== 1) {
                    log.error('cache del error', result)
                }
                resolve();
            })
            .catch(error => {
                log.error('cache del error', error)
                resolve();
            })
        })
    }

}
