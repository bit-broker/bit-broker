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

// --- view class (inherited)

class View {

    // --- returns a restful url

    static rest(...resources) {
        return resources.join('/');
    }
}

// --- controller class (embedded)

class Controller extends View {

    // --- an entity type

    static entity(item) {
        return {
            id: item.name,
            url: this.rest(process.env.REGISTER_SERVER_BASE, 'entity', item.name),
            description: item.description
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

    // --- a policy

    static policy(item) {
        return {
            id: item.slug,
            name: item.record.name,
            url: this.rest(process.env.POLICY_SERVER_BASE, 'policy', item.slug),
            policy: item.record
        };
    }

    // --- a list of policy ids

    static policies(items) {
        let doc = [];

        for (let i = 0; i < items.length; i++) {
            doc.push(this.policy(items[i]));
        }

        return doc;
    }
}

// --- contributor class (embedded)

class Contributor extends View {

    // --- a connector

    static connector(item, full = true) {
        let doc = {
            id: item.name,
            url: this.rest(process.env.REGISTER_SERVER_BASE, 'entity', item.entity_name, 'connector', item.name),
            description: item.description
        };

        if (full) {
            doc = Object.assign(doc, {
                entity: {
                    id: item.entity_name,
                    url: this.rest(process.env.REGISTER_SERVER_BASE, 'entity', item.entity_name),
                },
                contribution: {
                    id: item.contribution_id,
                    url: item.contribution_id === null ? null : this.rest(process.env.CATALOG_SERVER_BASE, 'connector', item.contribution_id),
                },
                webhook: item.webhook,
                cache: item.cache,
                in_session: item.in_session
            });
        }

        return doc;
    }

    // --- a list of connectors

    static connectors(items) {
        let doc = [];

        for (let i = 0; i < items.length; i++) {
            doc.push(this.connector(items[i], false));
        }

        return doc;
    }
}

// --- consumer class (embedded)

class Consumer extends View {

    // --- an entity type

    static entity(item) {
        return {
            id: item.name,
            url: this.rest(process.env.CONSUMER_SERVER_BASE, 'entity', item.name),
            description: item.description
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
            url: this.rest(process.env.CONSUMER_SERVER_BASE, 'entity', item.entity_name, item.public_id),
            type: item.entity_name,
            name: item.name
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

// --- exports

module.exports = {
    controller: Controller,
    contributor: Contributor,
    consumer: Consumer
};
