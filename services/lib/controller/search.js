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
The search controller.

Provides useful search criteria for finding users, entities, etc.
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const HTTP = require('http-status-codes');
const CONST = require('../constants.js');
const failure = require('../errors.js');
const model = require('../model/index.js');
const log = require('../logger.js').Logger;

// --- search class (exported)

module.exports = class Search {

    // --- search for items

    static find(req, res, next, cb) {
        let query = (req.query.q || '').toLowerCase();
        let errors = [];

        errors = errors.concat(model.validate.search(query));

        if (errors.length) {
            throw new failure(HTTP.BAD_REQUEST, errors);
        }

        cb(query)

        .then(items => res.json(items))
        .catch(error => next(error));
    }

    // --- search for user organizations

    user_org(req, res, next) {
        Search.find(req, res, next, query => model.search.user_org(query));
    }

    // --- search for entity tags

    entity_tags(req, res, next) {
        Search.find(req, res, next, query => model.search.entity_tags(query));
    }
}
