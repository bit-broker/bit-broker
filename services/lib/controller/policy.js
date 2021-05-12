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

  The policy process controller.

  Provides process control abstraction for all bit-broker services, who should
  all come via this model and never manipulate the domain entities directly.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const HTTP = require('http-status-codes');
const failure = require('http-errors');
const model = require('../model/index.js');
const view = require('../view/index.js');
const log = require('../logger.js').Logger;
const Redis = require("ioredis");
const redis = new Redis(process.env.POLICY_CACHE, { commandTimeout: 2000 });

redis
.on('connect', () => {
    log.info('Redis connect')
})
.on('ready', () => {
    log.info('Redis ready')
})
.on('error', (e) => {
    log.error('Redis ready', e)
})
.on('close', () => {
    log.info('Redis close')
})
.on('reconnecting', () => {
    log.info('Redis reconnecting')
})
.on('end', () => {
    log.info('Redis end')
})

// update a redis cache entry. Redis errors here are consumed and logged as they are not fatal for the parent promise chain...
function cacheWrite(pid, policy) {
    return new Promise((resolve, reject) => {
        redis.set(process.env.POLICY_CACHE_KEY_PREFIX + pid, JSON.stringify(policy))
        .then(result => {
            if (result !== "OK") {
                log.error('redis cache write error', result)
            }
            resolve();
        })
        .catch(error => {
            log.error('redis cache write error', error)
            resolve();
        })
    })
}

// clear a redis cache entry. Redis errors here are consumed and logged as they are not fatal for the parent promise chain...
function cacheClear(pid) {

    return new Promise((resolve, reject) => {
        redis.del(process.env.POLICY_CACHE_KEY_PREFIX + pid)
        .then(result => {
            if (result !== 1) {
                log.error('redis cache del error', result)
            }
            resolve();
        })
        .catch(error => {
            log.error('redis cache del error', error)
            resolve();
        })
    })
}

// --- policy class (exported)

module.exports = class Policy {

    // --- extracts a properties object from a req body, removes extraneous properties that maybe present and sets default values

    static properties(body) {
        return {
            name: body.name || '',
            description: body.description || '',
            policy: body.policy || {}
        };
    }

    // --- lists all policies

    list(req, res, next) {

        model.policy.list()

        .then(items => {
            res.json(view.policy.policies(items));
        })

        .catch(error => next(error));
    }

    // --- get details of a named policy

    get(req, res, next) {
        let pid = req.params.pid.toLowerCase();

        model.policy.find(pid)

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            res.json(view.policy.policy(item));
        })

        .catch(error => next(error));
    }

    // --- adds a new policy

    insert(req, res, next) {
        log.info('policy', req.params.pid, 'insert');
        let pid = req.params.pid.toLowerCase();
        let properties = Policy.properties(req.body);
        let errors = [];

        errors = errors.concat(model.validate.slug(pid));
        errors = errors.concat(model.validate.policy(properties));

        if (errors.length) {
            throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
        }

        model.policy.find(pid)

        .then(item => {
            if (item) {
                log.info('policy', pid, 'insert', 'duplicate');
                throw failure(HTTP.CONFLICT);
            }

            return model.policy.insert(pid, { properties });
        })

        // then update rate limit service

        .then(() => {
            return cacheWrite(pid, properties);
        })

        .then(() => {
            log.info('policy', pid, 'insert', 'complete');
            let href = `${ req.protocol }://${ req.get('host') }${ req.originalUrl }`;
            res.set({ 'Location': href }).status(HTTP.CREATED).send();
        })

        .catch(error => next(error));
    }

    // --- modifies an existing policy

    update(req, res, next) {
        log.info('policy', req.params.pid, 'update');
        let pid = req.params.pid.toLowerCase();
        let properties = Policy.properties(req.body);
        let errors = [];

        errors = errors.concat(model.validate.policy(properties));

        if (errors.length) {
            throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
        }

        model.policy.find(pid)

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            return model.policy.update(pid, { properties });
        })

        // then update rate limit service

        .then(() => {
            return cacheWrite(pid, properties);
        })

        .then(() => {
            log.info('policy', pid, 'update', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }

    // --- deletes a policy

    delete(req, res, next) {
        log.info('policy', req.params.pid, 'delete');
        let pid = req.params.pid.toLowerCase();

        model.policy.find(pid)

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            return model.policy.delete(pid)
        })

        // then update rate limit service

        .then(() => {
            return cacheClear(pid)
        })

        .then(() => {
            log.info('policy', pid, 'delete', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }
}
