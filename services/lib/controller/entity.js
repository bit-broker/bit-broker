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
The entity process controller.

Provides process control abstraction for all bit-broker services, who should
all come via this model and never manipulate the domain entities directly.
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const HTTP = require('http-status-codes');
const failure = require('../errors.js');
const model = require('../model/index.js');
const view = require('../view/index.js');
const log = require('../logger.js').Logger;

// --- entity class (exported)

module.exports = class Entity {

    // --- extracts a properties object from a req body, removes extraneous properties that maybe present and sets default values

    static properties(body) {
        return {
            name: body.name || '',
            description: body.description || '',
            schema: body.schema || {},
            timeseries: body.timeseries || {},
            tags: body.tags ?? [],
            icon: body.icon ?? ''
        };
    }

    // --- lists all entity types

    list(req, res, next) {

        model.entity.list()

        .then(items => {
            res.json(view.coordinator.entities(req.originalRoute, items));
        })

        .catch(error => next(error));
    }

    // --- get details of a named entity type

    get(req, res, next) {
        let eid = req.params.eid.toLowerCase();

        model.entity.find(eid)

        .then(item => {
            if (!item) throw new failure(HTTP.NOT_FOUND);
            res.json(view.coordinator.entity(req.originalRoute, item));
        })

        .catch(error => next(error));
    }

    // --- adds a new entity type

    insert(req, res, next) {
        log.info('entity', req.params.eid, 'insert');
        let eid = req.params.eid.toLowerCase();
        let properties = Entity.properties(req.body);
        let errors = [];

        errors = errors.concat(model.validate.slug(eid));
        errors = errors.concat(model.validate.entity(properties));

        if (errors.length) {
            throw new failure(HTTP.BAD_REQUEST, errors);
        }

        model.entity.find(eid)

        .then(item => {
            if (item) {
                log.info('entity', eid, 'insert', 'duplicate');
                throw new failure(HTTP.CONFLICT);
            }

            return model.entity.insert(eid, { properties });
        })

        .then(() => {
            log.info('entity', eid, 'insert', 'complete');
            res.set({ 'Location': req.originalResource }).status(HTTP.CREATED).send();
        })

        .catch(error => next(error));
    }

    // --- modifies an existing entity type

    update(req, res, next) {
        log.info('entity', req.params.eid, 'update');
        let eid = req.params.eid.toLowerCase();
        let properties = Entity.properties(req.body);
        let errors = [];

        errors = errors.concat(model.validate.entity(properties));

        if (errors.length) {
            throw new failure(HTTP.BAD_REQUEST, errors);
        }

        model.entity.find(eid)

        .then(item => {
            if (!item) throw new failure(HTTP.NOT_FOUND);
            return model.entity.update(eid, { properties });
        })

        .then(() => {
            log.info('entity', eid, 'update', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }

    // --- deletes an entity type

    delete(req, res, next) {
        log.info('entity', req.params.eid, 'delete');
        let eid = req.params.eid.toLowerCase();

        model.entity.find(eid)

        .then(item => {
            if (!item) throw new failure(HTTP.NOT_FOUND);
            return model.entity.delete(eid)
        })

        .then(() => {
            log.info('entity', eid, 'delete', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }
}
