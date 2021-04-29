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

  The policy process controller.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const HTTP = require('http-status-codes');
const failure = require('http-errors');
const model = require('../model/index.js');
const view = require('../view.js');
const log = require('../logger.js').Logger;

// --- policy class (exported)

module.exports = class Policy {

    // --- lists all policies

    list(req, res, next) {

        model.policy.list()

        .then(items => {
            res.json(view.controller.policies(items));
        })

        .catch(error => next(error));
    }

    // --- get details of a named policy

    get(req, res, next) {
        let pid = req.params.pid.toLowerCase();

        model.policy.find(pid)

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            res.json(view.controller.policy(item));
        })

        .catch(error => next(error));
    }

    // --- adds a new policy

    insert(req, res, next) {
        log.info('policy', "'" + req.params.pid + "'", 'insert');
        let pid = req.params.pid.toLowerCase();
        let record = req.body || '';
        let errors = [];

        errors = errors.concat(model.validate.name(pid));
        // ToDo validate JSON body...

        if (errors.length) {
            throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
        }

        model.policy.find(pid)

        .then(item => {
            if (item) {
                log.info('policy', pid, 'insert', 'duplicate');
                throw failure(HTTP.CONFLICT);
            }

            return model.policy.insert(pid, { record });
        })

        .then(() => {
            log.info('policy', pid, 'insert', 'complete');
            let href = `${ req.protocol }://${ req.get('host') }${ req.originalUrl }`;
            res.set({ 'Location': href }).status(HTTP.CREATED).send();
        })

        .catch(error => next(error));
    }

    // --- modifies an existing policy 

    update(req, res, next) {
        log.info('policy', req.params.pid, 'update');
        let pid = req.params.pid.toLowerCase();
        let record = req.body || '';
        let errors = [];

        // ToDo validate JSON body...

        if (errors.length) {
            throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
        }

        model.policy.find(pid)

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            return model.policy.update(pid, { record });
        })

        .then(() => {
            log.info('policy', pid, 'update', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }

    // --- deletes a policy

    delete(req, res, next) {
        log.info('policy', req.params.pid, 'delete');
        let pid = req.params.pid.toLowerCase();

        model.policy.find(pid)

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            return model.policy.delete(pid)
        })

        .then(() => {
            log.info('policy', pid, 'delete', 'complete');
            res.status(HTTP.NO_CONTENT).send();
        })

        .catch(error => next(error));
    }
}
