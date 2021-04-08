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

  Formats the output for all bit-brokers services in order to ensure there is
  consistency in representation.

*/

'use strict'; // code assumes ECMAScript 6

// --- view class

class View {

    // --- constructor

    constructor(base_register, base_catalog) {
        this.base_register = base_register.replace(/\/$/g, ''); // without trailing slash
        this.base_catalog = base_catalog.replace(/\/$/g, ''); // without trailing slash
    }

    // --- entity url

    url_entity(eid) {
        return `${ this.base_register }/entity/${ eid }`;
    }

    // --- connector url

    url_connector(eid, cid) {
        return `${ this.url_entity(eid) }/connector/${ cid }`;
    }

    // --- contribution url

    url_contribution(id) {
        return id === null ? null : `${ this.base_catalog }/connector/${ id }`;
    }

    // --- an entity type

    entity(item) {
        return {
            id: item.name,
            url: this.url_entity(item.name),
            description: item.description
        };
    }

    // --- a list of entity types

    entities(items) {
        let doc = [];

        for (let i = 0; i < items.length; i++) {
            doc.push(this.entity(items[i]));
        }

        return doc;
    }

    // --- a connector

    connector(item, full = true) {
        let doc = {
            id: item.name,
            url: this.url_connector(item.entity_name, item.name),
            description: item.description
        };

        if (full) {
            doc = Object.assign(doc, {
                entity: {
                    id: item.entity_name,
                    url: this.url_entity(item.entity_name),
                },
                contribution: {
                    id: item.contribution_id,
                    url: this.url_contribution(item.contribution_id),
                },
                webhook: item.webhook,
                cache: item.cache
            });
        }

        return doc;
    }

    // --- a list of connectors

    connectors(items) {
        let doc = [];

        for (let i = 0; i < items.length; i++) {
            doc.push(this.connector(items[i], false));
        }

        return doc;
    }
}

// --- exports

module.exports = new View(process.env.REGISTER_SERVER_BASE, process.env.CATALOG_SERVER_BASE);
