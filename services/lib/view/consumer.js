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

  The consumer view

  Formats the output for all bit-brokers services in order to ensure there is
  consistency in representation.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const View = require('./view.js');

// --- consumer class (embedded)

module.exports = class Consumer extends View {

    // --- an entity type

    static entity(item) {
        return {
            id: item.entity_slug,
            url: this.rest(process.env.CONSUMER_BASE, 'entity', item.entity_slug),
            name: item.entity_properties.name,
            description: item.entity_properties.description
        };
    }

    // --- a list of entity types

    static entities(items) {
        let doc = [];

        for (let i = 0; i < items.length; i++) {
            doc.push(this.entity(items[i]));
        }

        return doc;
    }

    // --- an entity instance

    static instance(item, full = true) {
        let doc = {
            id: item.public_id,
            url: this.rest(process.env.CONSUMER_BASE, 'entity', item.entity_slug, item.public_id),
            type: item.entity_slug,
            name: item.record.name
        };

        if (full) {
            doc = Object.assign(doc, { entity: item.record.entity });
        }

        return doc;
    }

    // --- a list of entity instances

    static instances(items) {
        let doc = [];

        for (let i = 0; i < items.length; i++) {
            doc.push(this.instance(items[i], false));
        }

        return doc;
    }
}
