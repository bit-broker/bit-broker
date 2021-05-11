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

const Helper = require('../helper.js');
const HTTP = require('http-status-codes');
const failure = require('http-errors');
const model = require('../model/index.js');
const view = require('../view/index.js');
const log = require('../logger.js').Logger;
const convert = require ('mongo-query-to-postgres-jsonb');

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

    // --- performs a catalog query

    catalog(req, res, next) {
        let q = req.query.q || {};

        if (Helper.is_json(q)) {
            let w = convert ('record', JSON.parse(q));

            model.catalog.query(w)

            .then(items => {
                res.json(items);
            })

            .catch(error => next(error));
        } else {
            throw failure(HTTP.BAD_REQUEST);
        }
    }

    // --- lists all the entity types

    types(req, res, next) {
        model.entity.list()

        .then(items => {
            res.json(view.consumer.entities(items));
        })

        .catch(error => next(error));
    }

    // --- lists all the entity instances for the given entity type

    list(req, res, next) {
        let type = req.params.type.toLowerCase();

        model.catalog.list(type)

        .then(items => {
            // TODO only id entity is missing if (!items.length) throw failure(HTTP.NOT_FOUND);
            res.json(view.consumer.instances(items));
        })

        .catch(error => next(error));
    }

    // --- get details for a given entity instance

    get(req, res, next) {
        let type = req.params.type.toLowerCase();
        let id = req.params.id.toLowerCase();

        model.catalog.find(type, id)

        .then(item => {
            if (!item) throw failure(HTTP.NOT_FOUND);
            res.json(view.consumer.instance(item));
        })

        .catch(error => next(error));
    }
}
