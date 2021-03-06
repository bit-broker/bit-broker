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
The connector process controller.

Provides process control abstraction for all bit-broker services, who should
all come via this model and never manipulate the domain entities directly.
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const HTTP = require('http-status-codes');
const failure = require('../errors.js');
const model = require('../model/index.js');
const view = require('../view/index.js');
const locales = require('../locales.js');
const log = require('../logger.js').Logger;

// --- connector class (exported)

module.exports = class Connector {

    // --- extracts a properties object from a req body, removes extraneous properties that maybe present and sets default values

    static properties(body) {
        return {
            name: body.name || '',
            description: body.description || '',
            webhook: body.webhook ? body.webhook.replace(/\/$/g, '') : null, // we store without any trailing slashes
            cache: body.cache || 0
        };
    }

    // --- lists all the connectors for the named entity type

    list(req, res, next) {
        let eid = req.params.eid.toLowerCase();

        model.entity.connector(eid)

        .then(connectors => {
            if (!connectors) throw new failure(HTTP.NOT_FOUND);
            return connectors.list();
        })

        .then(items => {
            res.json(view.contributor.connectors(req.originalRoute, items)); // can be empty
        })

        .catch(error => next(error));
    }

    // --- gets details of a named connector on the named entity type

    get(req, res, next) {
        let eid = req.params.eid.toLowerCase();
        let cid = req.params.cid.toLowerCase();

        model.entity.connector(eid)

        .then(connectors => {
            if (!connectors) throw new failure(HTTP.NOT_FOUND);
            return connectors.find(cid);
        })

        .then(item => {
            if (!item) throw new failure(HTTP.NOT_FOUND);
            res.json(view.contributor.connector(req.originalRoute, item));
        })

        .catch(error => next(error));
    }

    // --- adds a new connector to the named entity type

    insert(req, res, next) {
        log.info('entity', req.params.eid, 'connector', req.params.cid, 'insert');

        let eid = req.params.eid.toLowerCase();
        let cid = req.params.cid.toLowerCase();
        let properties = Connector.properties(req.body);
        let errors = [];

        errors = errors.concat(model.validate.slug(cid));
        errors = errors.concat(model.validate.connector(properties));

        if (errors.length) {
            throw new failure(HTTP.BAD_REQUEST, errors);
        }

        model.entity.connector(eid)

        .then(connectors => {
            if (!connectors) throw new failure(HTTP.NOT_FOUND);

            if (Object.keys(connectors.entity.properties.timeseries).length && !properties.webhook) {  // must supply a webhook when there are entity timeseries
                throw new failure(HTTP.BAD_REQUEST, [ failure.response('webhook', locales.__('error.connector-requires-webhook')) ]);
            }

            return connectors.find(cid)

            .then(item => {
                if (item) {
                    log.info('entity', eid, 'connector', cid, 'insert', 'duplicate');
                    throw new failure(HTTP.CONFLICT);
                }

                return connectors.insert(cid, { properties });
            });
        })

        .then(details => {
            log.info('entity', eid, 'connector', cid, 'insert', 'complete');
            res.set({ 'Location': req.originalResource }).status(HTTP.CREATED).send(details);
        })

        .catch(error => next(error));
    }

    // --- modifies an existing connector on the named entity type

    update(req, res, next) {
        log.info('entity', req.params.eid, 'connector', req.params.cid, 'update');

        let eid = req.params.eid.toLowerCase();
        let cid = req.params.cid.toLowerCase();
        let properties = Connector.properties(req.body);
        let errors = [];

        errors = errors.concat(model.validate.connector(properties));

        if (errors.length) {
            throw new failure(HTTP.BAD_REQUEST, errors);
        }

        model.entity.connector(eid)

        .then(connectors => {
            if (!connectors) throw new failure(HTTP.NOT_FOUND);

            if (Object.keys(connectors.entity.properties.timeseries).length && !properties.webhook) {  // must supply a webhook when there are entity timeseries
                throw new failure(HTTP.BAD_REQUEST, [ failure.response('webhook', locales.__('error.connector-requires-webhook')) ]);
            }

            return connectors.find(cid)

            .then(item => {
                if (!item) throw new failure(HTTP.NOT_FOUND);
                return connectors.update(cid, { properties });
            });
        })

        .then(() => {
            log.info('entity', eid, 'connector', cid, 'update', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }

    // --- deletes a connector on the named entity type

    delete(req, res, next) {
        log.info('entity', req.params.eid, 'connector', req.params.cid, 'delete');

        let eid = req.params.eid.toLowerCase();
        let cid = req.params.cid.toLowerCase();

        model.entity.connector(eid)

        .then(connectors => {
            if (!connectors) throw new failure(HTTP.NOT_FOUND);
            return connectors.find(cid)

            .then(item => {
                if (!item) throw new failure(HTTP.NOT_FOUND);
                return connectors.delete(cid);
            });
        })

        .then(() => {
            log.info('entity', eid, 'connector', cid, 'delete', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }

    // --- add or remove live status of a connector

    static live(req, res, next, is_live) {
        log.info('entity', req.params.eid, 'connector', req.params.cid, 'live', is_live ? 'add' : 'delete');

        let eid = req.params.eid.toLowerCase();
        let cid = req.params.cid.toLowerCase();

        model.entity.connector(eid)

        .then(connectors => {
            if (!connectors) throw new failure(HTTP.NOT_FOUND);
            return connectors.find(cid)

            .then(item => {
                if (!item) throw new failure(HTTP.NOT_FOUND);
                return connectors.update(cid, { is_live }); // no error if already in the desired state
            });
        })

        .then(() => {
            log.info('entity', req.params.eid, 'connector', req.params.cid, 'live', is_live ? 'add' : 'delete', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }

    // --- live status handlers

    live_add(req, res, next) { Connector.live(req, res, next, true ) };
    live_del(req, res, next) { Connector.live(req, res, next, false) };
}
