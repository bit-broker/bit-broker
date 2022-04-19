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
The user access process controller.

Provides process control abstraction for all bit-broker services, who should
all come via this model and never manipulate the domain entities directly.
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const HTTP = require('http-status-codes');
const CONST = require('../constants.js');
const failure = require('../errors.js');
const locales = require('../locales.js');
const model = require('../model/index.js');
const view = require('../view/index.js');
const log = require('../logger.js').Logger;

// --- access class (exported)

module.exports = class Access {

    // --- lists all accesses for a given user

    list(req, res, next) {
        let uid = req.params.uid.toLowerCase();

        model.user.access(uid)

        .then(accesses => {
            if (!accesses) throw new failure(HTTP.NOT_FOUND);
            return accesses.list();
        })

        .then(items => {
            res.json(view.coordinator.accesses(req.originalRoute, items)); // can be empty
        })

        .catch(error => next(error));
    }

    // --- get details of a given access for a given user

    get(req, res, next) {
        let uid = req.params.uid.toLowerCase();
        let pid = req.params.pid.toLowerCase();

        model.user.access(uid)

        .then(accesses => {
            if (!accesses) throw new failure(HTTP.NOT_FOUND);
            return accesses.find_by_policy(pid);
        })

        .then(item => {
            if (!item) throw new failure(HTTP.NOT_FOUND);
            res.json(view.coordinator.access(req.originalRoute, item));
        })

        .catch(error => next(error));
    }

    // --- adds a new access for a given user

    insert(req, res, next) {
        log.info('coordinator', 'user', req.params.uid, 'access', req.params.pid, 'insert');

        let uid = req.params.uid.toLowerCase();
        let pid = req.params.pid.toLowerCase();

        model.policy.find(pid)

        .then (policy => {
            if (!policy) throw new failure(HTTP.NOT_FOUND);

            return model.user.access(uid)

            .then(accesses => {
                if (!accesses) throw new failure(HTTP.NOT_FOUND);
                return accesses.find_by_policy(pid)

                .then(item => {
                    if (item) {
                        log.info('coordinator', 'user', uid, 'access', pid, 'insert', 'duplicate');
                        throw new failure(HTTP.CONFLICT);
                    }

                    return accesses.insert(pid, { user_id: uid, policy_id: policy.id });
                });
            })
        })

        .then(result => {
            log.info('coordinator', 'user', uid, 'access', pid, 'insert', 'complete');
            let href = `${ req.protocol }://${ req.get('host') }${ req.originalUrl.replace(/\/$/, '') }`;
            res.set({ 'Location': href }).status(HTTP.CREATED).send(result.token);
        })

        .catch(error => next(error));
    }

    // --- updates an access by generating a fresh token

    update(req, res, next) {
        log.info('coordinator', 'user', req.params.uid, 'access', req.params.pid, 'update');

        let uid = req.params.uid.toLowerCase();
        let pid = req.params.pid.toLowerCase();

        model.user.access(uid)

        .then(accesses => {
            if (!accesses) throw new failure(HTTP.NOT_FOUND);
            return accesses.find_by_policy(pid)

            .then(item => {
                if (!item) throw new failure(HTTP.NOT_FOUND);
                return accesses.update(pid, item);
            })
        })

        .then(result => {
            log.info('coordinator', 'user', uid, 'access', pid, 'update', 'complete');
            res.status(HTTP.OK).send(result.token);
        })

        .catch(error => next(error));
    }

    // --- deletes an access type

    delete(req, res, next) {
        log.info('coordinator', 'user', req.params.uid, 'access', req.params.pid, 'delete');

        let uid = req.params.uid.toLowerCase();
        let pid = req.params.pid.toLowerCase();

        model.user.access(uid)

        .then(accesses => {
            if (!accesses) throw new failure(HTTP.NOT_FOUND);
            return accesses.find_by_policy(pid)

            .then(item => {
                if (!item) throw new failure(HTTP.NOT_FOUND);
                return accesses.delete(item);
            });
        })

        .then(() => {
            log.info('coordinator', 'user', uid, 'access', pid, 'delete', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }
}
