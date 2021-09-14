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

  The user access process controller.

  Provides process control abstraction for all bit-broker services, who should
  all come via this model and never manipulate the domain entities directly.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const HTTP = require('http-status-codes');
const CONST = require('../constants.js');
const failure = require('http-errors');
const locales = require('../locales.js');
const model = require('../model/index.js');
const view = require('../view/index.js');
const log = require('../logger.js').Logger;

// --- access class (exported)

module.exports = class Access {

    // --- extracts a properties object from a req body, removes extraneous properties that maybe present and sets default values

    static properties(body) {
        return {
            role: (body.role || '').toString().toLowerCase(),
            context: body.context ? body.context.toString() : null // optional
        };
    }

    // --- lists all accesses for a given user

    list(req, res, next) {
        let uid = req.params.uid.toLowerCase();

        model.user.access(uid)

        .then(accesses => {
            if (!accesses) throw failure(HTTP.NOT_FOUND);
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
        let aid = req.params.aid.toLowerCase();

        model.user.access(uid)

        .then(accesses => {
            if (!accesses) throw failure(HTTP.NOT_FOUND);
            return accesses.find(aid);
        })

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            res.json(view.coordinator.access(req.originalRoute, item));
        })

        .catch(error => next(error));
    }

    // --- checks that the role and context pair are a valid combination

    static check_role_context(role, context) {
        let check = null;

        switch (role) {
            case CONST.ROLE.COORDINATOR:
                check = Promise.resolve(context === null ? '' : locales.__('error.access-invalid-context', context));
            break;

            case CONST.ROLE.CONTRIBUTOR:
                check = Promise.resolve(locales.__('error.access-invalid-role', role));
            break;

            case CONST.ROLE.CONSUMER:
                check = model.policy.find(context).then (item => item ? '' : locales.__('error.access-invalid-context', context));
            break;

            default:
                check = Promise.resolve(locales.__('error.access-invalid-role', role));
        }

        return check;
    }

    // --- adds a new access for a given user

    insert(req, res, next) {
        log.info('coordinator', 'user', req.params.uid, 'access', 'insert');

        let uid = req.params.uid.toLowerCase();
        let properties = Access.properties(req.body);
        let errors = [];

        errors = errors.concat(model.validate.access(properties));

        if (errors.length) {
            throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
        }

        Access.check_role_context (properties.role, properties.context)  // extended checks on role and context pair

        .then (error => {
            if (error.length) {
                throw failure(HTTP.BAD_REQUEST, error);
            }

            return model.user.access(uid);
        })

        .then(accesses => {
            if (!accesses) throw failure(HTTP.NOT_FOUND);
            return accesses.find_by_role_context(properties.role, properties.context)

            .then(item => {
                if (item) {
                    log.info('coordinator', 'user', uid, 'access', 'insert', 'duplicate');
                    throw failure(HTTP.CONFLICT);
                }

                return accesses.insert(properties);
            });
        })

        .then(result => {
            log.info('coordinator', 'user', uid, 'access', 'insert', 'complete', result.id);
            let href = `${ req.protocol }://${ req.get('host') }${ req.originalUrl.replace(/\/$/, '') }/${ result.id }`;
            res.set({ 'Location': href }).status(HTTP.CREATED).send(result.token);
        })

        .catch(error => next(error));
    }

    // --- updates an access by generating a fresh token

    update(req, res, next) {
        log.info('coordinator', 'user', req.params.uid, 'access', req.params.aid, 'update');

        let uid = req.params.uid.toLowerCase();
        let aid = req.params.aid.toLowerCase();
        let properties = Access.properties(req.body);

        model.user.access(uid)

        .then(accesses => {
            if (!accesses) throw failure(HTTP.NOT_FOUND);
            return accesses.find(aid)

            .then(item => {
                if (!item) throw failure(HTTP.NOT_FOUND);

                if (item.role !== properties.role ||
                    item.context !== properties.context) {
                    throw failure(HTTP.BAD_REQUEST, locales.__('error.access-details-not-matched'));
                }

                return accesses.update(item);
            })
        })

        .then(result => {
            log.info('coordinator', 'user', uid, 'access', aid, 'update', 'complete');
            res.status(HTTP.OK).send(result.token);
        })

        .catch(error => next(error));
    }

    // --- deletes an access type

    delete(req, res, next) {
        log.info('coordinator', 'user', req.params.uid, 'access', req.params.aid, 'delete');

        let uid = req.params.uid.toLowerCase();
        let aid = req.params.aid.toLowerCase();

        model.user.access(uid)

        .then(accesses => {
            if (!accesses) throw failure(HTTP.NOT_FOUND);
            return accesses.find(aid)

            .then(item => {
                if (!item) throw failure(HTTP.NOT_FOUND);
                return accesses.delete(aid, item);
            });
        })

        .then(() => {
            log.info('coordinator', 'user', uid, 'access', aid, 'delete', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }
}
