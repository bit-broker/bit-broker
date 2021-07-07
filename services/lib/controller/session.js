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

  The session process controller.

  Provides process control abstraction for all bit-broker services, who should
  all come via this model and never manipulate the domain entities directly.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const HTTP = require('http-status-codes');
const CONST = require('../constants.js');
const failure = require('http-errors');
const model = require('../model/index.js');
const view = require('../view/index.js');
const log = require('../logger.js').Logger;

// --- session class (exported)

module.exports = class Session {

    // --- opens a session for the given data connector

    open(req, res, next) {
        log.info('connector', req.params.cid, 'session', 'open', req.params.mode);
        let cid = req.params.cid;
        let mode = req.params.mode.toLowerCase();
        let errors = [];

        errors = errors.concat(model.validate.id(cid));
        errors = errors.concat(model.validate.mode(mode));

        if (errors.length) {
            throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
        }

        model.connector.session(cid)

        .then(session => {
            if (!session) throw failure(HTTP.NOT_FOUND);
            if (session.id) {
                log.warn('connector', cid, 'session', 'open', mode, 'overwrite', session.id);
            }

            session.open(mode)

            .then(() => {
                res.json(session.id);
            });
        })

        .catch(error => next(error));
    }

    // --- processed actions on an open session for the given data connector

    action(req, res, next) {
        log.info('connector', req.params.cid, 'session', req.params.sid, 'action', req.params.action);
        let cid = req.params.cid;
        let sid = req.params.sid;
        let action = req.params.action.toLowerCase();
        let records = req.body;
        let errors = [];

        errors = errors.concat(model.validate.id(cid));
        errors = errors.concat(model.validate.id(sid));
        errors = errors.concat(model.validate.action(action));

        if (action === CONST.ACTION.UPSERT) errors = errors.concat(model.validate.records_upsert(records));
        if (action === CONST.ACTION.DELETE) errors = errors.concat(model.validate.records_delete(records));

        if (errors.length) {
            throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
        }

        model.connector.session(cid)

        .then(session => {
            if (!session) throw failure(HTTP.NOT_FOUND);
            if (session.id != sid) throw failure(HTTP.UNAUTHORIZED);

            if (action === CONST.ACTION.UPSERT) {
                let scheme = session.connector.entity_properties.schema;

                if (Object.keys(scheme).length) {
                    errors = model.validate.records_entity(records, scheme);

                    if (errors.length) {
                        throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
                    }
                }
            }

            return session.process(action, records);
        })

        .then(() => {
            res.status(HTTP.NO_CONTENT).send(); // TODO: Some return doc here?
        })

        .catch(error => next(error));
    }

    // --- closes a session for the given data connector

    close(req, res, next) {
        log.info('connector', req.params.cid, 'session', req.params.sid, 'close', req.params.commit);
        let cid = req.params.cid;
        let sid = req.params.sid;
        let commit = req.params.commit.toLowerCase();
        let errors = [];

        errors = errors.concat(model.validate.id(cid));
        errors = errors.concat(model.validate.id(sid));
        errors = errors.concat(model.validate.commit(commit));

        if (errors.length) {
            throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
        }

        model.connector.session(cid)

        .then(session => {
            if (!session) throw failure(HTTP.NOT_FOUND);
            if (session.id != sid) throw failure(HTTP.UNAUTHORIZED);

            return session.close(commit === 'true'); // converts to a boolean
        })

        .then(() => {
            res.status(HTTP.OK).send();  // TODO: Some report here
        })

        .catch(error => next(error));
    }
}
