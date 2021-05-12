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
const Helper = require('../helper.js');
const Status = require('../status.js');
const failure = require('http-errors');
const model = require('../model/index.js');
const view = require('../view/index.js');
const log = require('../logger.js').Logger;

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
        if (slug === null && Status.IS_LIVE === false) return Promise.resolve({});  // TODO - this is a development only catch which we should remove

        return model.policy.find(slug)

        .then(item => {
            if (!item) throw failure(HTTP.FORBIDDEN);
            return item.properties.policy.segment_query;
        })
    }

    // --- performs a catalog query

    catalog(req, res, next) {
        let q = req.query.q || '{}';

        if (!Helper.is_valid_json(q)) {
            throw failure(HTTP.BAD_REQUEST);
        }

        Consumer.with_policy(null) // TODO - add the policy from the header

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
        model.entity.list()  // TODO - should this be subject to policy also? probably yes - what about entity hiding...

        .then(items => {
            res.json(view.consumer.entities(items));
        })

        .catch(error => next(error));
    }

    // --- lists all the entity instances for the given entity type

    list(req, res, next) {
        let type = req.params.type.toLowerCase();

        Consumer.with_policy(null) // TODO - add the policy from the header

        .then(segment => {
            return model.catalog.list(segment, type);
        })

        .then(items => {
            res.json(view.consumer.instances(items)); // can be empty
        })

        .catch(error => next(error));
    }

    // --- get details for a given entity instance

    get(req, res, next) {
        let type = req.params.type.toLowerCase();
        let id = req.params.id.toLowerCase();

        Consumer.with_policy(null) // TODO - add the policy from the header

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
