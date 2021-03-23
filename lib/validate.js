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

  Provides parameter validation for all bit-broker services.

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const validator = require('validator');
const locales = require('./locales.js');

// --- validate class

module.exports = class Validate {

    // --- validation constants

    static get NAME_MAX_LENGTH() { return 64; } // less than or equal to
    static get NAME_MIN_LENGTH() { return 3; } // greater than or equal to
    static get NAME_VALID_FORMAT() { return '^[a-z][a-z0-9_]*$'; }
    static get DESC_MAX_LENGTH() { return 255; } // less than or equal to
    static get DESC_MIN_LENGTH() { return 1; } // greater than or equal to

    // --- validates an entity name

    name(item) {
        let errors = [];

        if (item.length < Validate.NAME_MIN_LENGTH) errors.push(locales.__('error.entity.name-short', item));
        if (item.length > Validate.NAME_MAX_LENGTH) errors.push(locales.__('error.entity.name-long', item));
        if (new RegExp(Validate.NAME_VALID_FORMAT).test(item) != true) errors.push(locales.__('error.entity.name-invalid-format', item));

        return errors;
    }

    // --- validates an entity description

    description(item) {
        let errors = [];

        if (item.length < Validate.DESC_MIN_LENGTH) errors.push(locales.__('error.entity.desc-short', item));
        if (item.length > Validate.DESC_MAX_LENGTH) errors.push(locales.__('error.entity.desc-long', item));

        return errors;
    }
}
