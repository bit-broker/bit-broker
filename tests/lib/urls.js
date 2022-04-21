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
Shared methods to generate restful urls
*/

'use strict'; // code assumes ECMAScript 6

// --- one-time operations

process.env.TESTS_COORDINATOR = process.env.TESTS_COORDINATOR.replace(/\/*$/g, '');
process.env.TESTS_CONTRIBUTOR = process.env.TESTS_CONTRIBUTOR.replace(/\/*$/g, '');
process.env.TESTS_CONSUMER = process.env.TESTS_CONSUMER.replace(/\/*$/g, '');

// --- URLs class (embedded)

class URLs {

    // --- class constructor

    constructor() {
        this.api = {  // apis listed by restful prefix
            entity: process.env.TESTS_COORDINATOR,
            connector: process.env.TESTS_CONTRIBUTOR,
            policy: process.env.TESTS_COORDINATOR,
            user: process.env.TESTS_COORDINATOR
        };
    }

    // --- returns a restful url to an known API service

    rest(...resources) {
        resources.unshift(resources.length ? this.api[resources[0]] : undefined);
        resources = resources.filter(item => item != undefined);
        return resources.join('/');
    }

    // --- restful access points

    coordinator() { return process.env.TESTS_COORDINATOR; }
    contributor() { return process.env.TESTS_CONTRIBUTOR; }
    consumer() { return process.env.TESTS_CONSUMER; }

    error_test(server) { return server + '/error/test' }

    entity(eid) { return this.rest('entity', eid); }
    connector(eid, cid) { return this.rest('entity', eid, 'connector', cid); }
    connector_live(eid, cid) { return this.rest('entity', eid, 'connector', cid, 'live'); }
    user(uid) { return this.rest('user', uid); }
    user_email(email) { return this.rest('user', 'email', email); }
    user_coordinator(uid) { return this.rest('user', uid, 'coordinator'); }
    access(uid, pid) { return this.rest('user', uid, 'access', pid); }
    policy(pid, resource) { return this.rest('policy', pid, resource); }

    session_open(cid, mode = 'stream') { return this.rest('connector', cid, 'session', 'open', mode); }
    session_action(cid, sid, action = 'upsert') { return this.rest('connector', cid, 'session', sid, action); }
    session_close(cid, sid, commit = true) { return this.rest('connector', cid, 'session', sid, 'close', commit ? 'true' : 'false'); }

    consumer_entity(eid, iid) { return this.consumer() + '/entity' + (eid ? `/${eid}` : '') + (iid ? `/${iid}` : ''); }
    consumer_catalog(q) { return this.consumer() + '/catalog' + (q ? `?q=${ encodeURIComponent(JSON.stringify(q)) }` : ''); }
}

// --- exported classes

module.exports = new URLs();
