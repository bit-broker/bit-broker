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

  The user process controller.

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

// --- user class (exported)

module.exports = class User {

    // --- extracts a properties object from a req body, removes extraneous properties that maybe present and sets default values

    static properties(body) {
        return {
            name: body.name || '',
            email: (body.email || '').toLowerCase()
        };
    }

    // --- lists all users

    list(req, res, next) {

        model.user.list()

        .then(items => {
            res.json(view.coordinator.users(items));
        })

        .catch(error => next(error));
    }

    // --- get details of a named users

    get(req, res, next) {
        let uid = req.params.uid.toLowerCase();

        model.user.find(uid)

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            res.json(view.coordinator.user(item));
        })

        .catch(error => next(error));
    }

    // --- adds a new user

    insert(req, res, next) {
        log.info('coordinator', 'user', 'insert');
        let properties = User.properties(req.body);
        let errors = [];

        errors = errors.concat(model.validate.email(properties.email));
        errors = errors.concat(model.validate.user_name(properties.name));

        if (errors.length) {
            throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
        }

        model.user.find_by_email(properties.email)

        .then(item => {
            if (item) {
                log.info('coordinator', 'user', properties.email, 'insert', 'duplicate');
                throw failure(HTTP.CONFLICT);
            }

            return model.user.insert({ email: properties.email, properties: { name: properties.name } });
        })

        .then((id) => {
            log.info('coordinator', 'user', properties.email, 'insert', 'complete', id);
            let href = `${ req.protocol }://${ req.get('host') }${ req.originalUrl }/${ id }`;
            res.set({ 'Location': href }).status(HTTP.CREATED).send();
        })

        .catch(error => next(error));
    }

    // --- modifies an existing user

    update(req, res, next) {
        log.info('coordinator', 'user', req.params.uid, 'update');
        let uid = req.params.uid.toLowerCase();
        let properties = User.properties(req.body);
        let errors = [];

        errors = errors.concat(model.validate.user_name(properties.name));

        if (errors.length) {
            throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
        }

        model.user.find(uid)

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            return model.user.update(uid, { properties: { name: properties.name }});
        })

        .then(() => {
            log.info('coordinator', 'user', uid, 'update', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }

    // --- deletes a user 

    delete(req, res, next) {
        log.info('coordinator', 'user', req.params.uid, 'delete');
        let uid = req.params.uid.toLowerCase();

        model.user.find(uid)

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            return model.user.delete(uid)
        })

        .then(() => {
            log.info('coordinator', 'user', uid, 'delete', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }
}
