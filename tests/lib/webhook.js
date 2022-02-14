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
A webhook server to act as a end-point for tests
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const express = require('express');
const url = require('url');

// --- webhook class (exported)

module.exports = class Webhook {

    constructor(base, name, cb) {
        this.server = null;
        this.app = express();
        this.port = url.parse(base).port;

        this.app.get('/', (req, res) => res.json({ now: new Date().toISOString(), name: name }));
        this.app.get('/entity/:type/:id', (req, res) => res.json(cb(req.params.type, req.params.id)));
    }

    start() { this.server = this.app.listen(this.port); }
    stop() { this.server.close(); }
}
