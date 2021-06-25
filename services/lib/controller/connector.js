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

  The connector process controller.

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

// --- connector class (exported)

module.exports = class Connector {

    // --- extracts a properties object from a req body, removes extraneous properties that maybe present and sets default values

    static properties(body) {
        return {
            name: body.name || '',
            description: body.description || '',
            webhook: body.webhook || null,
            cache: body.cache || 0
        };
    }

    // --- lists all the connectors for the named entity type

    list(req, res, next) {
        let eid = req.params.eid.toLowerCase();

        model.entity.connector(eid)

        .then(connectors => {
            if (!connectors) throw failure(HTTP.NOT_FOUND);
            return connectors.list();
        })

        .then(items => {
            res.json(view.contributor.connectors(items)); // can be empty
        })

        .catch(error => next(error));
    }

    // --- gets details of a named connector on the named entity type

    get(req, res, next) {
        let eid = req.params.eid.toLowerCase();
        let cid = req.params.cid.toLowerCase();

        model.entity.connector(eid)

        .then(connectors => {
            if (!connectors) throw failure(HTTP.NOT_FOUND);
            return connectors.find(cid);
        })

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            res.json(view.contributor.connector(item));
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
            throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
        }

        model.entity.connector(eid)

        .then(connectors => {
            if (!connectors) throw failure(HTTP.NOT_FOUND);
            return connectors.find(cid)

            .then(item => {
                if (item) {
                    log.info('entity', eid, 'connector', cid, 'insert', 'duplicate');
                    throw failure(HTTP.CONFLICT);
                }

                return connectors.insert(cid, { properties });
            });
        })

        .then(details => {
            log.info('entity', eid, 'connector', cid, 'insert', 'complete');
            let href = `${ req.protocol }://${ req.get('host') }${ req.originalUrl.replace(/\/$/, '') }`;
            res.set({ 'Location': href }).status(HTTP.CREATED).send(details);
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
            throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
        }

        model.entity.connector(eid)

        .then(connectors => {
            if (!connectors) throw failure(HTTP.NOT_FOUND);
            return connectors.find(cid)

            .then(item => {
                if (!item) throw failure(HTTP.NOT_FOUND);
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
            if (!connectors) throw failure(HTTP.NOT_FOUND);
            return connectors.find(cid)

            .then(item => {
                if (!item) throw failure(HTTP.NOT_FOUND);
                return connectors.delete(cid);
            });
        })

        .then(() => {
            log.info('entity', eid, 'connector', cid, 'delete', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }
}
