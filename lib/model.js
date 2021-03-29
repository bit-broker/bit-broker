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

  NOTE: All model methods assume that parameters have been validated and any
  required presence check has been completed by the controller.

  NOTE: Never use strings manipulation via knex.raw, as this will introduce
  SQL injection vulnerabilities. Also use either native knex methods or knex
  raw bindings.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const Knex = require('knex');
const Validate = require('./validate.js');

// --- running contexts

var db = new Knex({ client: 'pg', connection: process.env.DB_CONNECT }); // TODO: should we fix the client version here?

// --- connector class-

class Connector {

    // --- class constructor

    constructor(name) {
        this.entity_name = name;
    }

    // --- column list

    static get COLUMNS() {
        return [
            'connector.name',
            'entity.name as entity_name',
            'connector.description',
            'connector.contribution_id',
            'connector.contribution_key',
            'connector.webhook',
            'connector.cache',
            'connector.created_at',
            'connector.updated_at'
        ];
    }

    // --- table read context

    get _rows() {
        return db('connector').select(Connector.COLUMNS).join('entity', 'entity.id', 'connector.entity_id').where({ 'entity.name': this.entity_name });
    }

    // --- table write context

    get _write() {
        return db('connector').where('entity_id', db('entity').select('id').where({ 'name': this.entity_name }));
    }

    // --- all connectors on the instance entity type

    list() {
        return this._rows;
    }

    // --- find a connector by name on the instance entity type

    find(name) {
        return this._rows.where({ 'connector.name': name }).first();
    }

    // --- inserts a new connector on the instance entity type

    insert(name, details) {
        if (details.webhook.length === 0) details.webhook = null;
        details.name = name;

        let insert = ['entity_id', 'name', 'description', 'webhook', 'cache'];
        let select = db.raw(`entity.id AS entity_id, :name AS name, :description AS description, :webhook AS webhook, :cache AS cache`, details);
        let insertion = db.raw('connector (??, ??, ??, ??, ??)', insert);
        let selection = db.from('entity').where({ 'entity.name': this.entity_name }).select(select);

        return this._write.from(insertion).insert(selection);
    }

    // --- updates a connector on the instance entity type

    update(name, details) {
        if (details.webhook.length === 0) details.webhook = null;
        return this._write.where({ name }).update(details);
    }

    // --- deletes a connector on the instance entity type

    delete(name) {
        return this._write.where({ name }).delete();
    }
}

// --- entity class-

class Entity {

    // --- class constructor

    constructor() {
        // nothing yet
    }

    // --- column list

    static get COLUMNS() {
        return [
            'entity.name',
            'entity.description',
            'entity.created_at',
            'entity.updated_at'
        ];
    }

    // --- table context

    get _rows() {
        return db('entity').select(Entity.COLUMNS);
    }

    // --- all entity types

    list() {
        return this._rows;
    }

    // --- find an entity type by name

    find(name) {
        return this._rows.where({ name }).first();
    }

    // --- inserts a new entity type

    insert(name, details) {
        details.name = name
        return this._rows.insert(details);
    }

    // --- updates an existing entity type

    update(name, details) {
        return this.find(name).update(details);
    }

    // --- deletes an existing entity type

    delete(name) {
        return this.find(name).delete();
    }

    // --- gets the connector sub-model

    get(name) {
        return new Connector(name);
    }
}

// --- register class-

class Register {

    // --- class constructor

    constructor() {
        this.entity = new Entity();
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
