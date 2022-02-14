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
The shared locales module used by bit-broker components. Facilitates
consistency in handling of locale translations.
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const { I18n } = require('i18n');

// --- exports

module.exports = new I18n({
    locales: ['en'], // others can be added over time
    defaultLocale: 'en',
    updateFiles: false,
    directory: process.env.PATH_LOCALES || '../locales'
});
