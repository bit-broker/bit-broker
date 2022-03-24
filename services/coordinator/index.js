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
The bit-broker coordinator server - offering services to add, remove and
update entity types and their associated connectors.

Use the following command to generate a bootstrap coordinator access key

  curl \
    --silent \
    --request POST \
    --header "Content-Type: application/json" \
    --output bootstrap.key \
    http://bbk-coordinator:8001/v1/user/1/coordinator
*/

'use strict'; // code assumes ECMAScript 6

// --- load paths - can be overridden with environment variables

const PATH_LIB = process.env.PATH_LIB || '../lib';
const PATH_CFG = process.env.PATH_CFG || '../..';

// --- load configuration - do this first

require('dotenv').config({ path: `${ PATH_CFG }/.env` });
process.env.APP_DATABASE = process.env.APP_DATABASE.replace('CREDENTIALS', process.env.COORDINATOR_USER);

// --- dependancies

const Server = require(`${ PATH_LIB }/server.js`);
const controller = require(`${ PATH_LIB }/controller/index.js`);
const log = require(`${ PATH_LIB }/logger.js`).Logger;

// --- running contexts

var api = new Server('bit-broker coordinator service', process.env.COORDINATOR_PORT, process.env.COORDINATOR_BASE);

// --- entity endpoints

api.router.get('/entity', controller.entity.list);
api.router.get('/entity/:eid', controller.entity.get);
api.router.post('/entity/:eid', controller.entity.insert);
api.router.put('/entity/:eid', controller.entity.update);
api.router.delete('/entity/:eid', controller.entity.delete);

// --- connector endpoints

api.router.get('/entity/:eid/connector', controller.connector.list);
api.router.get('/entity/:eid/connector/:cid', controller.connector.get);
api.router.post('/entity/:eid/connector/:cid', controller.connector.insert);
api.router.put('/entity/:eid/connector/:cid', controller.connector.update);
api.router.delete('/entity/:eid/connector/:cid', controller.connector.delete);

// --- policy endpoints

api.router.get('/policy', controller.policy.list);
api.router.get('/policy/:pid', controller.policy.get);
api.router.get('/policy/:pid/access-control', controller.policy.get_access_control);
api.router.post('/policy/:pid', controller.policy.insert);
api.router.put('/policy/:pid', controller.policy.update);
api.router.delete('/policy/:pid', controller.policy.delete);

// --- user endpoints

api.router.get('/user', controller.user.list);
api.router.get('/user/:uid', controller.user.get);
api.router.get('/user/email/:email', controller.user.get_email);
api.router.post('/user', controller.user.insert);
api.router.put('/user/:uid', controller.user.update);
api.router.delete('/user/:uid', controller.user.delete);  // rescinds all the user's keys
api.router.post('/user/:uid/coordinator', controller.user.coordinator_add);
api.router.delete('/user/:uid/coordinator', controller.user.coordinator_del);

// --- access endpoints

api.router.get('/user/:uid/access', controller.access.list);
api.router.get('/user/:uid/access/:pid', controller.access.get);
api.router.post('/user/:uid/access/:pid', controller.access.insert);
api.router.put('/user/:uid/access/:pid', controller.access.update);
api.router.delete('/user/:uid/access/:pid', controller.access.delete); // rescinds a single user key

// --- start the server

api.listen(() => {
    log.info('app mode', process.env.APP_MODE);
});
