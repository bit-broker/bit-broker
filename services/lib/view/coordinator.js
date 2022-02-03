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

  The coordinator view

  Formats the output for all bit-brokers services in order to ensure there is
  consistency in representation.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const View = require('./view.js');

// --- coordinator class (embedded)

module.exports = class Coordinator extends View {

    // --- an entity type

    static entity(route, item, full = true) {
        let doc = {
            id: item.slug,
            url: this.rest(route, 'entity', item.slug),
            name: item.properties.name,
            description: item.properties.description
        };

        if (full) {
            doc = Object.assign(doc, {
                schema: item.properties.schema
            });
        }

        return doc;
    }

    // --- a list of entity types

    static entities(route, items) {
        let doc = [];

        for (let i = 0; i < items.length; i++) {
            doc.push(this.entity(route, items[i], false));
        }

        return doc;
    }

    // --- a user

    static user(route, item, full = true) {
        let doc = {
            id: item.id,
            url: this.rest(route, 'user', item.id),
            name: item.properties.name,
            email: item.email,
            admin: item.admin
        };

        if (full) {
            doc = Object.assign(doc, {
                addendum: item.properties.addendum
            });
        }

        return doc;
    }

    // --- a list of users

    static users(route, items) {
        let doc = [];

        for (let i = 0; i < items.length; i++) {
            doc.push(this.user(route, items[i], false));
        }

        return doc;
    }

    // --- an access

    static access(route, item, full = true) {
        let doc = {
            id: item.id,
            url: this.rest(route, 'user', item.user_id, 'access', item.id),
            role: item.role,
            context: item.context,
            created: item.created_at
        };

        if (full) {
            // nothing more yet
        }

        return doc;
    }

    // --- a list of accesses

    static accesses(route, items) {
        let doc = [];

        for (let i = 0; i < items.length; i++) {
            doc.push(this.access(route, items[i], false));
        }

        return doc;
    }

    // --- a policy

    static policy(route, item, full = true) {
        let doc = {
            id: item.slug,
            url: this.rest(route, 'policy', item.slug),
            name: item.properties.name,
            description: item.properties.description
        };

        if (full) {
            doc = Object.assign(doc, {
                policy: item.properties.policy
            });
        }

        return doc;
    }

    // --- policy access_control only

    static policy_access_control(item) {
        return item.properties.policy.access_control;
    }

    // --- a list of policy ids

    static policies(route, items) {
        let doc = [];

        for (let i = 0; i < items.length; i++) {
            doc.push(this.policy(route, items[i], false));
        }

        return doc;
    }
}
