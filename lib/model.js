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

const Knex = require('knex');
const Validate = require('./validate.js');

// --- running contexts

var db = new Knex({ client: 'pg', connection: process.env.DB_CONNECT }); // TODO: should we fix the client version here?

// --- register class- all methods assume that parameters have been validated and presence check has been completed

class Register {

    // --- table context

    rows() {
        return db('register');
    }

    // --- all entity types

    list() {
        return this.rows();
    }

    // --- an entity type found by name

    find(name) {
        return this.rows().where({ name }).first();
    }

    // --- inserts a new entity type

    insert(name, description) {
        return this.rows().insert({ name, description });
    }

    // --- updates an existing entity type

    update(name, description) {
        return this.find(name).update({ description });
    }

    // --- deletes an existing entity type

    delete(name) {
        return this.find(name).delete();
    }
}

// --- model class

module.exports = class Model {

    // --- class constructor

    constructor() {
        this.register = new Register();
        this.validate = new Validate();
    }
}
