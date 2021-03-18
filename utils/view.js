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
  a consistency in representation.

*/

'use strict'; // code assumes ECMAScript 6

// --- constants - not deployment configurable

const IS_LIVE = (process.env.NODE_ENV === 'production');

// --- view class

module.exports = class View {

    // --- a list of entity types

    entities(items) {

        let names = [];
        items.forEach(item => names.push(item.name));
        return names;

    }

}
