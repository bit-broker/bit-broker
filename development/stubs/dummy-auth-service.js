/**
 * Copyright 2022 Cisco and its affiliates
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

'use strict'; // code assumes ECMAScript 6

// --- load paths

const PATH_LIB = process.env.PATH_LIB || '../../services/lib';
const PATH_CFG = process.env.PATH_CFG || '../..';

// --- load configuration

require('dotenv').config({ path: `${ PATH_CFG }/.env` });

// --- dependancies

const Server = require(`${ PATH_LIB }/server.js`);
const log = require(`${ PATH_LIB }/logger.js`).Logger;
const crypto = require('crypto')
const url = require('url');

// --- running contexts

let parts = url.parse(process.env.AUTH_SERVICE);
let api = new Server('dummy auth service', parts.port || 80, parts.path.replace(/^\/|\/$/g, ''));

// --- dummy endpoints

api.router.post('/token', (req, res) => {
    log.info('request', 'scope', req.body.scope, 'audience', req.body.aud);

    let jti = crypto.randomUUID();
    let token = `${ crypto.randomUUID() }.${ crypto.randomUUID() }.${ crypto.randomUUID() }`;
    res.json({ jti, token });
});

api.router.delete('/token', (req, res) => {
    let jtis = req.body;
    log.info ('revoke', 'list', jtis.length);

    for (let i = 0 ; i < jtis.length ; i++) {
        log.info ('revoke', jtis[i]);
    }

    res.send();
});

// --- start the server

api.listen();
