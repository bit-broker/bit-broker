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

  The entity process controller.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const HTTP = require('http-status-codes');
const failure = require('http-errors');
const model = require('../model/index.js');
const view = require('../view.js');
const log = require('../logger.js').Logger;

// --- entity class (exported)

module.exports = class Entity {

    // --- lists all entity types in the register

    list(req, res, next) {

        model.entity.list()

        .then(items => {
            res.json(view.entities(items));
        })

        .catch(error => next(error));
    }

    // --- get details of a named entity type

    get(req, res, next) {
        let eid = req.params.eid.toLowerCase();

        model.entity.find(eid)

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            res.json(view.entity(item));
        })

        .catch(error => next(error));
    }

    // --- adds a new entity type to the register

    insert(req, res, next) {
        log.info('register', 'entity', "'"+req.params.eid+"'", 'insert');
        let eid = req.params.eid.toLowerCase();
        let description = req.body.description || '';
        let errors = [];

        errors = errors.concat(model.validate.name(eid));
        errors = errors.concat(model.validate.description(description));

        if (errors.length) {
            throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
        }

        model.entity.find(eid)

        .then(item => {
            if (item) {
                log.info('register', 'entity', eid, 'insert', 'duplicate');
                throw failure(HTTP.CONFLICT);
            }

            return model.entity.insert(eid, { description });
        })

        .then(() => {
            log.info('register', 'entity', eid, 'insert', 'complete');
            let href = `${ req.protocol }://${ req.get('host') }${ req.originalUrl }`;
            res.set({ 'Location': href }).status(HTTP.CREATED).send();
        })

        .catch(error => next(error));
    }

    // --- modifies an existing entity type in the register

    update(req, res, next) {
        log.info('register', 'entity', req.params.eid, 'update');
        let eid = req.params.eid.toLowerCase();
        let description = req.body.description || '';
        let errors = [];

        errors = errors.concat(model.validate.description(description));

        if (errors.length) {
            throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
        }

        model.entity.find(eid)

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            return model.entity.update(eid, { description });
        })

        .then(() => {
            log.info('register', 'entity', eid, 'update', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }

    // --- deletes an entity type from the register

    delete(req, res, next) {
        log.info('register', 'entity', req.params.eid, 'delete');
        let eid = req.params.eid.toLowerCase();

        model.entity.find(eid)

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            return model.entity.delete(eid)
        })

        .then(() => {
            log.info('register', 'entity', eid, 'delete', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }
}
