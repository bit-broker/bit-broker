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

  Shared methods to generate restful urls

*/

'use strict'; // code assumes ECMAScript 6

// --- URLs class (embedded)

class URLs {

    // --- class constructor

    constructor() {
        this.api = {  // apis listed by restful prefix
            entity: process.env.COORDINATOR_BASE,
            connector: process.env.CONTRIBUTOR_BASE,
            policy: process.env.COORDINATOR_BASE,
            user: process.env.COORDINATOR_BASE
        };
    }

    // --- returns a restful url to an known API service

    rest(...resources) {
        resources.unshift(resources.length ? this.api[resources[0]] : undefined);
        resources = resources.filter(item => item != undefined);
        return resources.join('/');
    }

    // --- restful access points

    entity(eid) { return this.rest('entity', eid); }
    connector(eid, cid) { return this.rest('entity', eid, 'connector', cid); }
    user(uid) { return this.rest('user', uid); }
    access(uid, aid) { return this.rest('user', uid, 'access', aid); }
    policy(pid, resource) { return this.rest('policy', pid, resource); }

    session_open(cid, mode = 'stream') { return this.rest('connector', cid, 'session', 'open', mode); }
    session_action(cid, sid, action = 'upsert') { return this.rest('connector', cid, 'session', sid, action); }
    session_close(cid, sid, commit = true) { return this.rest('connector', cid, 'session', sid, 'close', commit ? 'true' : 'false'); }
}

// --- exported classes

module.exports = new URLs();
