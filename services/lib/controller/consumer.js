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
const CONST = require('../constants.js');
const Status = require('../status.js');
const failure = require('http-errors');
const model = require('../model/index.js');
const view = require('../view/index.js');
const log = require('../logger.js').Logger;
const fetch = require('node-fetch');

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

    static with_policy(audience) {
        if (Status.USE_POLICY) {
            let slug = audience.replace(CONST.PREFIX.POLICY, '');

            return model.policy.cacheRead(slug || '') // empty string is not a valid policy slug

            .then(item => {
                if (!item) throw failure(HTTP.UNAUTHORIZED);
                return item;
            })
        } else {
            return Promise.resolve(CONST.POLICY.EMPTY);
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

        Consumer.with_policy(req.header(CONST.POLICY.HEADER))

        .then(policy => {
            return model.catalog.query(policy.data_segment.segment_query, JSON.parse(q))

            .then(items => {
                res.json(view.consumer.instances(items, policy.legal_context));
            })
        })

        .catch(error => next(error));
    }

    // --- lists all the entity types

    types(req, res, next) {

        Consumer.with_policy(req.header(CONST.POLICY.HEADER))

        .then(policy => {
            return model.catalog.types(policy.data_segment.segment_query)

            .then(items => {
                res.json(view.consumer.entities(items, policy.legal_context)); // can be empty
            })
        })

        .catch(error => next(error));
    }

    // --- lists all the entity instances for the given entity type

    list(req, res, next) {
        let type = req.params.type.toLowerCase();
        let limit = req.params.limit || 50;
        let offset = req.params.offset || 0;

        Consumer.with_policy(req.header(CONST.POLICY.HEADER))

        .then(policy => {
            return model.catalog.types(policy.data_segment.segment_query) // TODO: Calling this first is a heavy price to pay for returning HTTP/404 vs []

            .then(types => {
                let slugs = types.map(t => t.entity_slug);
          //      if (!slugs.includes(type)) throw failure(HTTP.NOT_FOUND);  // the entity type is either not present or not in policy

                return model.catalog.list(policy.data_segment.segment_query, type)

                .then(items => {
                    res.json(view.consumer.instances(items, policy.legal_context)); // can be empty
                })
            })
        })

        .catch(error => next(error));
    }

    // --- get details for a given entity instance

    get(req, res, next) {
        let type = req.params.type.toLowerCase();
        let id = req.params.id.toLowerCase();

        Consumer.with_policy(req.header(CONST.POLICY.HEADER))

        .then(policy => {
            return model.catalog.find(policy.data_segment.segment_query, type, id)

            .then(item => {
                if (!item) throw failure(HTTP.NOT_FOUND);

                let webhook = item.connector_properties.webhook;
                let request = Promise.resolve(); // assume no webhook

                if (webhook) {
                    request = fetch(`${ webhook }/entity/${ item.entity_slug }/${ item.vendor_id }`, { headers: CONST.FETCH.HEADERS, timeout: CONST.FETCH.TIMEOUT });
                }

                request.then(res => res ? res.json() : null)
                .then(extra => res.json(view.consumer.instance(item, extra, policy.legal_context, policy.data_segment.field_masks)))
                .catch(error => // on fail: same record, but without any webhook data
                {
                    log.warn('webhook failure', type, id, error);
                    return res.json(view.consumer.instance(item, null, policy.legal_context, policy.data_segment.field_masks))
                });
            })
        })

        .catch(error => next(error));
    }
}
