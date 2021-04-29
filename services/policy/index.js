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

  The bit-broker policy server, offering services to manipulate data sharing policies

*/

'use strict'; // code assumes ECMAScript 6

// --- load paths - can be overridden with environment variables

const PATH_LIB = process.env.PATH_LIB || '../lib';
const PATH_CFG = process.env.PATH_CFG || '../..';

// --- load configuration

require('dotenv').config({ path: `${ PATH_CFG }/.env` });

// --- dependancies

const Server = require(`${ PATH_LIB }/server.js`);
const controller = require(`${ PATH_LIB }/controller/index.js`);

// --- running contexts

var api = new Server(process.env.POLICY_SERVER_NAME, process.env.POLICY_SERVER_BASE);

// --- policy endpoints

api.router.get('/policy', controller.policy.list);
api.router.get('/policy/:pid', controller.policy.get);
api.router.post('/policy/:pid', controller.policy.insert);
api.router.put('/policy/:pid', controller.policy.update);
api.router.delete('/policy/:pid', controller.policy.delete);

// --- start the server

api.listen();
