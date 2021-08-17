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

  View base class

  Formats the output for all bit-brokers services in order to ensure there is
  consistency in representation.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const Permit = require('../model/permit.js');

// --- view class (exported)

module.exports = class View {

    // --- static constants

    static REGEX_BBK = new RegExp("^[bB][bB][kK]://([a-z0-9][a-z0-9-]+)/([a-z0-9][a-z0-9-]+)/([^/]+)$", 'g');  // matches a bbk link

    // --- returns a restful url

    static rest(...resources) {
        return resources.join('/');
    }

    // --- iterates every value within an object recursively, calling the specified callback

    static each_value(object, cb) {
        if (object) {
            for (var key in object) {
                if (typeof object[key] === 'object') {
                    this.each_value(object[key], cb);
                } else {
                    object[key] = cb(object[key]);
                }
            }
        }
    }

    // --- maps bbk links to public urls - used in conjunction with the each_value function

    static map_bbk_links(item) {
        if (typeof item === 'string') {
            let match = View.REGEX_BBK.exec(item);

            if (match) {
                item = View.rest(process.env.CONSUMER_BASE, 'entity', match[1], Permit.public_key(match[2], match[3]));
            }
        }

        return item;
    }
}
