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
The shared status module used by bit-broker components. Facilitates
consistency in determining the project status.
*/

'use strict'; // code assumes ECMAScript 6

// --- exports

module.exports = {
    IS_LIVE: (process.env.NODE_ENV === 'production'),
    USE_POLICY: (process.env.APP_MODE !== 'open'),
    USE_SERVER_METRICS: (process.env.APP_SERVER_METRICS === 'true'),
    USE_SERVER_LOGGING: (process.env.APP_SERVER_LOGGING === 'true'),
    USE_FILE_LOGS: (process.env.APP_FILE_LOGGING === 'true')
};
