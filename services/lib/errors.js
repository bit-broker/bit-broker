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
A simple error object wrapper.
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const HTTP = require('http-status-codes');

// --- server class (exported)

module.exports = class HttpError {

    // --- constructor

    constructor(status = HTTP.INTERNAL_SERVER_ERROR, details = null) {
        this.status = status;
        this.details = details;
    }

    // --- standard format for error responses

    static response(name, reason, index = null) {
        return { name, index, reason };  // name / reason format is as per RFC#7807 - index is an addition for arrays
    }
}
