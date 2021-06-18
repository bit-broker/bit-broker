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
const failure = require('http-errors');
const model = require('../model/index.js');
const view = require('../view/index.js');
const log = require('../logger.js').Logger;

// --- access class (exported)

module.exports = class Access {

    // --- extracts a properties object from a req body, removes extraneous properties that maybe present and sets default values

    static properties(body) {
        return {
            role: (body.role || '').toLowerCase(),
            context: (body.context || '').toLowerCase()
        };
    }

    // --- lists all accesses for a given user

    list(req, res, next) {
        let uid = req.params.uid.toLowerCase();

        model.entity.user(uid)

        .then(accesses => {
            if (!accesses) throw failure(HTTP.NOT_FOUND);
            return accesses.list();
        })

        .then(items => {
            res.json(view.contributor.accesses(items)); // can be empty
        })

        .catch(error => next(error));
    }

    // --- get details of a given access for a given user

    get(req, res, next) {
        let uid = req.params.uid.toLowerCase();
        let aid = req.params.aid.toLowerCase();

        model.entity.user(uid)

        .then(accesses => {
            if (!accesses) throw failure(HTTP.NOT_FOUND);
            return accesses.find(aid);
        })

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            res.json(view.contributor.access(item));
        })

        .catch(error => next(error));
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

        model.entity.user(uid)

        .then(accesses => {
            if (!accesses) throw failure(HTTP.NOT_FOUND);
            return accesses.find_by_role_context(uid, properties.role, properties.context)

            .then(item => {
                if (item) {
                    log.info('coordinator', 'user', uid, 'access', 'insert', 'duplicate');
                    throw failure(HTTP.CONFLICT);
                }

                key_id = '012345678901234567890123456789012345';  // TODO: get from auth-service
                return accesses.insert({ key_id, role, context });
            });
        })

        .then((id) => {
            log.info('coordinator', 'user', uid, 'access', 'insert', 'complete', id);
            let href = `${ req.protocol }://${ req.get('host') }${ req.originalUrl }/${ id }`;
            res.set({ 'Location': href }).status(HTTP.CREATED).send();
        })

        .catch(error => next(error));
    }

    // --- deletes an access type

    delete(req, res, next) {
        log.info('coordinator', 'user', req.params.uid, 'access', req.params.aid, 'delete');

        let uid = req.params.uid.toLowerCase();
        let aid = req.params.aid.toLowerCase();

        model.entity.user(uid)

        .then(accesses => {
            if (!accesses) throw failure(HTTP.NOT_FOUND);
            return accesses.find(aid)

            .then(item => {
                if (!item) throw failure(HTTP.NOT_FOUND);
                return accesses.delete(aid);
            });
        })

        .then(() => {
            log.info('coordinator', 'user', uid, 'access', aid, 'delete', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }
}
