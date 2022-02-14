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

    static entity(route, item, legal) {
        return {
            id: item.entity_slug,
            url: this.rest(route, 'entity', item.entity_slug),
            name: item.entity_properties.name,
            description: item.entity_properties.description,
            legal: legal  // will get excluded if not passed in
        };
    }

    // --- a list of entity types

    static entities(route, items, legal) {
        let doc = [];

        for (let i = 0; i < items.length; i++) {
            doc.push(this.entity(route, items[i]));
        }

        return doc;
    }

    // --- unpacks a field mask into consistent parts - entity.section.field

    static unpack(mask) {
        let details = { valid: false };
        let parts = mask.trim().split('.');

        if (parts.length === 3) {
            let entity = parts.shift();
            let section = parts.shift();
            let field = parts.shift();

            if (entity.length && (section === 'entity' || section === 'instance') && field.length)
            {
                details = { entity, section, field, valid: true };
            }
        }

        return details;
    }

    // --- an entity instance

    static instance(route, item, extra, legal, masks, full = true) {
        let doc = {
            id: item.public_id,
            url: this.rest(route, 'entity', item.entity_slug, item.public_id),
            type: item.entity_slug,
            name: item.record.name
        };

        if (full) {
            doc = Object.assign(doc, { entity: item.record.entity });
            doc = Object.assign(doc, { instance: item.record.instance || {} })

            // merge in webhook extra data if any

            if (extra && typeof extra === 'object') {
                if (extra.entity && typeof extra.entity === 'object') doc.entity = Object.assign(doc.entity, extra.entity);
                if (extra.instance && typeof extra.instance === 'object') doc.instance = Object.assign(doc.instance, extra.instance);
            }

            // remove any policy masked fields

            masks = masks || [];

            for (let i = 0 ; i < masks.length ; i++) {
                let details = this.unpack(masks[i]);

                if (details.valid &&
                    doc.type === details.entity && // matched entity type
                    doc.hasOwnProperty(details.section) && // matched section - entity or instance
                    doc[details.section].hasOwnProperty(details.field)) { // matched field
                        delete doc[details.section][details.field];  // we hit a match for a field mask
                }
            }

            // remap bbk links to public urls - within entity and instance parts only

            this.each_value(route, doc.entity, this.map_bbk_links);
            this.each_value(route, doc.instance, this.map_bbk_links);
        }

        doc = Object.assign(doc, { legal: legal });  // adds the legal context

        return doc;
    }

    // --- a list of entity instances

    static instances(route, items, legal) {
        let doc = [];

        for (let i = 0; i < items.length; i++) {
            doc.push(this.instance(route, items[i], null, legal, undefined, false));
        }

        return doc;
    }
}
