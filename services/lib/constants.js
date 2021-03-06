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
Non configurable, system level constants
*/

'use strict'; // code assumes ECMAScript 6

// --- constants - not externally configurable

module.exports = {
    PAGING: {
        MAX_LIST: 250, // if you modify, make the same changes in the validation/paging.json file
        MAX_TIMESERIES: 500 // if you modify, make the same changes in the validation/timeseries.json file
    },
    ACTION: {
        UPSERT: 'upsert',
        DELETE: 'delete'
    },
    CONNECTOR: {
        ACCESS_CONTROL: { enabled: true, quota: { max_number: 86400, interval_type: 'day' }, rate: 10 } // rate is implicitly in seconds
    },
    FETCH: {
        HEADERS: {
            'Accept': 'application/json, text/plain',
            'Content-Type': 'application/json'
        },
        TIMEOUT: 2000
    },
    POLICY: {
        HEADER: 'x-bbk-audience',
        CONNECTORS: 'x-bbk-connectors',
        EMPTY: { data_segment: { segment_query: {}, field_masks: [] }, legal_context: [] } // the policy to use when USE_POLICY is false in .en
    },
    REDIS: {
        TIMEOUT: 2000
    },
    ROLE: {
        COORDINATOR: 'coordinator',
        CONTRIBUTOR: 'contributor',
        CONSUMER: 'consumer'
    },
    SESSION: {
        COMMIT: 'true',
        MODE: {
           STREAM: 'stream',
           REPLACE: 'replace',
           ACCRUE: 'accrue'
        },
        ROLLBACK: 'false'
    }
}
