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

  The contributor view

  Formats the output for all bit-brokers services in order to ensure there is
  consistency in representation.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const View = require('./view.js');

// --- contributor class (embedded)

module.exports = class Contributor extends View {

    // --- a connector

    static connector(route, item, full = true) {
        let doc = {
            id: item.slug,
            url: this.rest(route, 'entity', item.entity_slug, 'connector', item.slug),
            name: item.properties.name,
            description: item.properties.description
        };

        if (full) {
            doc = Object.assign(doc, {
                entity: {
                    id: item.entity_slug,
                    url: this.rest(route, 'entity', item.entity_slug),
                },
                contribution_id: item.contribution_id,
                webhook: item.properties.webhook,
                cache: item.properties.cache,
                in_session: item.session_id !== null
            });
        }

        return doc;
    }

    // --- a list of connectors

    static connectors(route, items) {
        let doc = [];

        for (let i = 0; i < items.length; i++) {
            doc.push(this.connector(route, items[i], false));
        }

        return doc;
    }
}
