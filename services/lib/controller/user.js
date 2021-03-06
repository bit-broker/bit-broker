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
The user process controller.

Provides process control abstraction for all bit-broker services, who should
all come via this model and never manipulate the domain entities directly.
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const HTTP = require('http-status-codes');
const CONST = require('../constants.js');
const Permit = require('../model/permit.js');
const failure = require('../errors.js');
const model = require('../model/index.js');
const view = require('../view/index.js');
const log = require('../logger.js').Logger;

// --- user class (exported)

module.exports = class User {

    // --- extracts a properties object from a req body, removes extraneous properties that maybe present and sets default values

    static properties(body) {
        return {
            name: body.name || '',
            email: (body.email || '').toString().toLowerCase(),
            organization: body.organization || '',
            addendum: body.addendum || {}
        };
    }

    // --- bootstraps the user service

    bootstrap() {
        model.user.virgin()

        .then(virgin => {
            log.info('user', 'bootstrap', virgin ? 'insert' : 'not required');
            let complete = Promise.resolve();

            if (virgin) {
                let name = process.env.BOOTSTRAP_USER_NAME || '';
                let email = process.env.BOOTSTRAP_USER_EMAIL || '';
                let organization = process.env.BOOTSTRAP_USER_ORG || '';
                let coordinator_key_id = process.env.BOOTSTRAP_USER_KEY_ID || '';
                let addendum = {};
                let errors = model.validate.user({ name, organization, email, addendum });

                if (errors.length) {
                    for (let i = 0 ; i < errors.length ; i++) {
                        log.error('user', 'bootstrap', 'validation', `${ errors[i].name } ${ errors[i].reason }`);
                    }

                    throw 'validation errors';
                }

                complete = model.user.insert({ email, coordinator_key_id, properties: { name, organization, addendum }}).then(id => {
                    log.info('user', 'bootstrap', 'insert', 'complete', id);
                });
            }

            return complete;
        })

        .catch(error => {
            log.error('user', 'bootstrap', error);
        });
    }

    // --- lists all users

    list(req, res, next) {

        model.user.list()

        .then(items => {
            res.json(view.coordinator.users(req.originalRoute, items));
        })

        .catch(error => next(error));
    }

    // --- get details of a named user

    get(req, res, next) {
        let uid = req.params.uid.toLowerCase();

        if (model.validate.user_id(uid).length) {  // the user id is not a valid form
            throw new failure(HTTP.NOT_FOUND);
        }

        model.user.find(uid)

        .then(item => {
            if (!item) throw new failure(HTTP.NOT_FOUND);
            res.json(view.coordinator.user(req.originalRoute, item));
        })

        .catch(error => next(error));
    }

    // --- get details of a user by email

    get_email(req, res, next) {
        let email = req.params.email.toLowerCase();

        model.user.find_by_email(email)

        .then(item => {
            if (!item) throw new failure(HTTP.NOT_FOUND);
            res.json(view.coordinator.user(req.originalRoute, item));
        })

        .catch(error => next(error));
    }

    // --- adds a new user

    insert(req, res, next) {
        log.info('user', 'insert');
        let properties = User.properties(req.body);
        let errors = [];

        errors = errors.concat(model.validate.user(properties));
        errors = errors.concat(model.validate.user_addendum(properties.addendum));

        if (errors.length) {
            throw new failure(HTTP.BAD_REQUEST, errors);
        }

        model.user.find_by_email(properties.email)

        .then(item => {
            if (item) {
                log.info('user', properties.email, 'insert', 'duplicate');
                throw new failure(HTTP.CONFLICT);
            }

            return model.user.insert({
                email: properties.email,
                properties: {
                    name: properties.name,
                    organization: properties.organization,
                    addendum: properties.addendum,
                }
            });
        })

        .then(id => {
            log.info('user', properties.email, 'insert', 'complete', id);
            let href = `${ req.originalResource }/${ id }`;
            res.set({ 'Location': href }).status(HTTP.CREATED).send();
        })

        .catch(error => next(error));
    }

    // --- modifies an existing user

    update(req, res, next) {
        log.info('user', req.params.uid, 'update');
        let uid = req.params.uid.toLowerCase();

        if (model.validate.user_id(uid).length) {  // the user id is not a valid form
            throw new failure(HTTP.NOT_FOUND);
        }

        let properties = User.properties(req.body);
        let errors = [];

        errors = errors.concat(model.validate.name(properties.name));
        errors = errors.concat(model.validate.organization(properties.organization));
        errors = errors.concat(model.validate.user_addendum(properties.addendum));

        if (errors.length) {
            throw new failure(HTTP.BAD_REQUEST, errors);
        }

        model.user.find(uid)

        .then(item => {
            if (!item) throw new failure(HTTP.NOT_FOUND);
            return model.user.update(uid, {
                properties: {
                    name: properties.name,
                    organization: properties.organization,
                    addendum: properties.addendum
                }
            });
        })

        .then(() => {
            log.info('user', uid, 'update', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }

    // --- deletes a user

    delete(req, res, next) {
        log.info('user', req.params.uid, 'delete');
        let uid = req.params.uid.toLowerCase();

        if (model.validate.user_id(uid).length) {  // the user id is not a valid form
            throw new failure(HTTP.NOT_FOUND);
        }

        model.user.find(uid)

        .then(item => {
            if (!item) throw new failure(HTTP.NOT_FOUND);
            return model.user.delete(uid)
        })

        .then(() => {
            log.info('user', uid, 'delete', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }

    // --- adds coordinator access to the given user

    coordinator_add(req, res, next) {
        log.info('user', req.params.uid, 'coordinator', 'add');
        let uid = req.params.uid.toLowerCase();
        let user = null;
        let token = null;

        if (model.validate.user_id(uid).length) {  // the user id is not a valid form
            throw new failure(HTTP.NOT_FOUND);
        }

        model.user.find(uid)

        .then(item => {
            if (!item) throw new failure(HTTP.NOT_FOUND);
            if (item.coordinator_key_id) throw new failure(HTTP.CONFLICT);
            user = item;
            return Permit.generate_token(CONST.ROLE.COORDINATOR, ''); // no token context for coordinator roles
        })

        .then(permit => {
            token = permit.token;
            return model.user.update(uid, { coordinator_key_id: permit.jti });
        })

        .then(() => {
            log.info('user', uid, 'coordinator', 'add', 'complete');
            res.status(HTTP.OK).send(token);
        })

        .catch(error => next(error));
    }

    // --- removes coordinator access from the given user

    coordinator_del(req, res, next) {
        log.info('user', req.params.uid, 'coordinator', 'del');
        let uid = req.params.uid.toLowerCase();
        let user = null;

        if (model.validate.user_id(uid).length) {  // the user id is not a valid form
            throw new failure(HTTP.NOT_FOUND);
        }

        model.user.find(uid)

        .then(item => {
            if (!item) throw new failure(HTTP.NOT_FOUND);
            if (!item.coordinator_key_id) throw new failure(HTTP.CONFLICT);
            // TODO: cant remove your own coordinator access
            user = item;
            return Permit.revoke_tokens([item.coordinator_key_id])
        })

        .then(() => {
            return model.user.update(uid, { coordinator_key_id: null });
        })

        .then(() => {
            log.info('user', uid, 'coordinator', 'del', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }
}
