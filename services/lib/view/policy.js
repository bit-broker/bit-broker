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

  The policy view

  Formats the output for all bit-brokers services in order to ensure there is
  consistency in representation.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const View = require('./view.js');

// --- coordinator class (embedded)

module.exports = class Policy extends View {

    // --- a policy

    static policy(item, full = true) {
        let doc = {
            id: item.slug,
            url: this.rest(process.env.POLICY_BASE, 'policy', item.slug),
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

    static policies(items) {
        let doc = [];

        for (let i = 0; i < items.length; i++) {
            doc.push(this.policy(items[i], false));
        }

        return doc;
    }
}
