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

  Provides database abstraction for all bit-broker services, who should all
  come via this model and never access the database directly.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const CONST = require('../constants.js');
const Knex = require('knex');
const Entity = require('./entity.js');
const Connector = require('./connector.js');
const Catalog = require('./catalog.js');
const Policy = require('./policy.js');
const User = require('./user.js');
const Validate = require('./validate.js');
const Redis = require("ioredis");
const log = require('../logger.js').Logger;

// --- running contexts

var db = new Knex({ client: 'pg', connection: process.env.APP_DATABASE }); // TODO: should we fix the client version here?
var redis = new Redis(process.env.POLICY_CACHE, { commandTimeout: CONST.REDIS.TIMEOUT });

// --- redis event logging

redis
.on('connect', () => { log.info('redis', 'connected') })
.on('ready', () => { log.info('redis', 'ready') })
.on('error', (error) => { log.error('redis', 'error', error) })
.on('close', () => { log.info('redis', 'close') })
.on('reconnecting', () => { log.info('redis', 'reconnecting') })
.on('end', () => { log.info('redis', 'end') });

// --- postgres test and report

db.raw('SELECT COUNT(id) FROM entity')
.then(result => { result.rowCount === 1 ? log.info('postgres', 'connected') : log.warn('postgres', 'connected', 'database not reachable') })
.catch(error => { log.error('postgres', 'error', error) });

// --- exports

module.exports = {
    catalog: new Catalog(db),
    connector: new Connector(db),
    entity: new Entity(db),
    policy: new Policy(db, redis),
    user: new User(db),
    validate: new Validate()
};
