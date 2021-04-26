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
const locales = require('../locales.js');
const status = require('../status.js');

// --- validate class (exported)

module.exports = class Validate {

    // --- validation constants - if you change any of these, remember to update the test harness too

    static get CACHE_MAX() { return 31536000 }; // one year in seconds
    static get CACHE_MIN() { return 0; }
    static get DESC_MAX_LENGTH() { return 8192; }
    static get DESC_MIN_LENGTH() { return 1; }
    static get ID_FORMAT() { return '^[a-z0-9][a-z0-9-]+$'; }
    static get ID_LENGTH() { return 36; }
    static get NAME_FORMAT() { return '^[a-z][a-z0-9_]+$'; }
    static get NAME_MAX_LENGTH() { return 64; }
    static get NAME_MIN_LENGTH() { return 3; }
    static get SESSION_ACTIONS() { return ['upsert', 'delete']; }
    static get SESSION_COMMITS() { return ['true', 'false']; }
    static get SESSION_MODES() { return ['accrue', 'stream', 'replace']; }
    static get URL_FORMAT() { return { protocols: ['http', 'https'], require_tld: status.IS_LIVE, require_protocol: true, require_host: true, require_valid_protocol: true } };
    static get URL_MAX_LENGTH() { return 255; }

    // --- validates a session action

    action(item) {
        let errors = [];

        if (Validate.SESSION_ACTIONS.includes(item) === false) errors.push(locales.__('error.action-invalid', item));

        return errors;
    }

    // --- validates a cache - can be zero

    cache(item) {
        let errors = [];
        let isnum = Number.isInteger(item);

        if (isnum) {
            if (item < Validate.CACHE_MIN) errors.push(locales.__('error.cache-small', item));
            if (item > Validate.CACHE_MAX) errors.push(locales.__('error.cache-large', item));
        } else {
            errors.push(locales.__('error.cache-invalid', item));
        }

        return errors;
    }

    // --- validates a session commit

    commit(item) {
        let errors = [];

        if (Validate.SESSION_COMMITS.includes(item) === false) errors.push(locales.__('error.commit-invalid', item));

        return errors;
    }

    // --- validates an entity description

    description(item) {
        let errors = [];

        if (item.length < Validate.DESC_MIN_LENGTH) errors.push(locales.__('error.desc-short', item));
        if (item.length > Validate.DESC_MAX_LENGTH) errors.push(locales.__('error.desc-long', item));

        return errors;
    }

    // --- validates an id

    id(item) {
        let errors = [];

        if (item.length != Validate.ID_LENGTH || new RegExp(Validate.ID_FORMAT).test(item) === false) errors.push(locales.__('error.id-invalid', item));

        return errors;
    }

    // --- validates a session mode

    mode(item) {
        let errors = [];

        if (Validate.SESSION_MODES.includes(item) === false) errors.push(locales.__('error.mode-invalid', item));

        return errors;
    }

    // --- validates an entity name

    name(item) {
        let errors = [];

        if (item.length < Validate.NAME_MIN_LENGTH) errors.push(locales.__('error.name-short', item));
        if (item.length > Validate.NAME_MAX_LENGTH) errors.push(locales.__('error.name-long', item));
        if (new RegExp(Validate.NAME_FORMAT).test(item) === false) errors.push(locales.__('error.name-invalid', item));

        return errors;
    }

    // --- validates a webhook - can be empty

    webhook(item) {
        let errors = [];

        if (item.length > Validate.URL_MAX_LENGTH) errors.push(locales.__('error.url-long', item));
        if (item.length > 0 && false === validator.isURL(item, Validate.URL_FORMAT)) errors.push(locales.__('error.url-invalid', item));

        return errors;
    }
}
