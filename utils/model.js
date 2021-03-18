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

const knex = require('knex')({ // TODO: should we fix the client version here?
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_UID,
        password: process.env.DB_PWD,
        database: process.env.DB_SCHEMA
    }
});

// --- constants - not deployment configurable

const IS_LIVE = (process.env.NODE_ENV === 'production');

// --- model class

module.exports = class Model {

    // --- a list of entity types

    entities() {

        return knex('entities').select('id', 'name').whereNull('deleted_at');

    }

}
