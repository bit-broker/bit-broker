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

  The consumer process controller.

  Provides process control abstraction for all bit-broker services, who should
  all come via this model and never manipulate the domain entities directly.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const HTTP = require('http-status-codes');
const Status = require('../status.js');
const failure = require('http-errors');
const model = require('../model/index.js');
const view = require('../view/index.js');
const log = require('../logger.js').Logger;

// --- constants - not .env configurable

const POLICY_HEADER = 'x-bb-policy';
const NO_POLICY_SEGMENT = {}; // the segment to use when USE_POLICY is false in .env - normally just {}

// --- timeseries class (embedded)

class Timeseries {

    // --- lists all the timeseries on the given entity instance

    list(req, res, next) {
        let type = req.params.type.toLowerCase();
        let id = req.params.id.toLowerCase();

        res.json([]); // TODO
    }

    // --- gets details of a named timeseries on the given entity instance

    get(req, res, next) {
        let type = req.params.type.toLowerCase();
        let id = req.params.id.toLowerCase();
        let tsid = req.params.tsid.toLowerCase();

        throw failure(HTTP.NOT_FOUND); // TODO
    }
}

// --- consumer class (exported)

module.exports = class Consumer {

    // --- constructor

    constructor() {
        this.timeseries = new Timeseries();
    }

    // --- within the context of an active policy

    static with_policy(slug) {
        if (Status.USE_POLICY) {
            return model.policy.cacheRead(slug || '') // empty string is not a valid policy slug

            .then(item => {
                if (!item) throw failure(HTTP.FORBIDDEN);
                return item.segment_query;
            })
        } else {
            return Promise.resolve(NO_POLICY_SEGMENT);
        }
    }

    // --- performs a catalog query

    catalog(req, res, next) {
        let q = req.query.q || '{}';
        let errors = [];

        errors = errors.concat(model.validate.query(q));

        if (errors.length) {
            throw failure(HTTP.BAD_REQUEST, errors.join("\n"));
        }

        Consumer.with_policy(req.header(POLICY_HEADER))

        .then(segment => {
            return model.catalog.query(segment, JSON.parse(q));
        })

        .then(items => {
            res.json(view.consumer.instances(items));
        })

        .catch(error => next(error));
    }

    // --- lists all the entity types

    types(req, res, next) {

        Consumer.with_policy(req.header(POLICY_HEADER))

        .then(segment => {
            return model.catalog.types(segment);
        })

        .then(items => {
            res.json(view.consumer.entities(items)); // can be empty
        })

        .catch(error => next(error));
    }

    // --- lists all the entity instances for the given entity type

    list(req, res, next) {
        let type = req.params.type.toLowerCase();

        Consumer.with_policy(req.header(POLICY_HEADER))

        .then(segment => {
            return model.catalog.types(segment) // TODO: Calling this first is a heavy price to pay for returning HTTP/404 vs []

            .then(types => {
                let slugs = types.map(t => t.entity_slug);
          //      if (!slugs.includes(type)) throw failure(HTTP.NOT_FOUND);  // the entity type is either not present or not in policy

                return model.catalog.list(segment, type);
            })

            .then(items => {
                res.json(view.consumer.instances(items)); // can be empty
            })
        })

        .catch(error => next(error));
    }

    // --- get details for a given entity instance

    get(req, res, next) {
        let type = req.params.type.toLowerCase();
        let id = req.params.id.toLowerCase();

        Consumer.with_policy(req.header(POLICY_HEADER))

        .then(segment => {
            return model.catalog.find(segment, type, id);
        })

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            res.json(view.consumer.instance(item));
        })

        .catch(error => next(error));
    }
}
