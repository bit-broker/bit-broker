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

  Provides opaquely generated of IDs and keys, of which components should make
  no assumptions other than their type and length.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const crypto = require('crypto');

// --- session class (exported)

module.exports = class Permit {

    // --- generates a unique session id

    static get SESSION_ID() {
        return crypto.randomUUID();
    }

    // --- generates a unique contribution id

    static get CONTRIBUTION_ID() {
        return crypto.randomUUID();
    }

    // --- generates a public key from a connector id and a vendor id

    static public_key(connector_id, vendor_id) {
        return crypto.createHash('sha256').update(`${connector_id}:${vendor_id}`).digest('hex');
    }
}
