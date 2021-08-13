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

  Shared testing data used by all test scripts

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const fs = require('fs');

// --- data used for tests (exported)

const DATA = {

    integer: function(max = 100, min = 0) {
        return Math.floor(Math.random() * (max - min) + min); // max is exclusive - min is inclusive
    },

    shuffle: function(array) {
        return array.sort(() => Math.random() - 0.5);
    },

    flip: function() {
        return Math.random() >= 0.5;
    },

    pluck: function(array) { // removes the item - so can be used for fetching unique elements
        return this.shuffle(array).pop();
    },

    pick: function(array) { // does not remove the item - so can get the same one twice
        return array[this.integer(array.length)];
    },

    someof: function(array, count) {
        let items = [];
        for (let i = 0; i < count; i++) {
            items.push(this.shuffle(array).pop());
        }
        return items.filter(function(e) { return e; });
    },

    text: function(size = 128) {
        let words = this.shuffle(DATA.PROSE.split(' '));
        let text = '';

        while (text.length < size) {
            text = text.concat(this.pick(words) + ' ');
        }

        return text.substring(0, size).replace(/\s$/, 'x'); // changes trailing spaces to 'x' in order to preserve desired size
    },

    name: function(size = 32) {
        return this.text(size);
    },

    slug: function(size = 16) {
        let slug = '';

        while (slug.length < size) {
            slug = slug.concat(DATA.SLUG.CHARS);
        }

        return slug.substring(0, size);
    },

    some_info: function() {
        return { name: DATA.name(), description: DATA.text() };
    },

    items: function() {
        return JSON.parse(fs.readFileSync('./data/country.json'));
    },

    record: function(index) {
        let items = DATA.items();
        return items[index];
    },

    records: function(indexes) {
        let items = DATA.items();
        let records = [];
        indexes.forEach(index => records.push(items[index]));
        return records;
    },

    any_index: function() {
        let items = DATA.items();
        return Math.floor(Math.random() * items.length);
    },

    keys: function(records) { // TODO - needed?
        let keys = [];
        records.forEach(record => keys.push(record.id));
        return keys;
    },

    STATUS: 'development', // tests are only for development deployments

    ERRORS: {
        BIG: 'must be less than or equal',
        SMALL: 'must be greater than or equal',
        MAX: 'not meet maximum length',
        MIN: 'not meet minimum length',
        CONFORM: 'does not conform to the',
        FORMAT: 'not match pattern',
        TYPE: 'is not of a type',
        INVALID: 'is not valid',
        ENUM: 'is not one of enum values',
        JSON: 'unexpected token',
        REQUIRED: 'requires property',
        ADDITIONAL: 'not allowed to have the additional property',
        MATCH: 'do not match'
    },

    CACHE: {
        SHORTEST: 0,
        REASONABLE: 86400, // seconds in a day
        LONGEST: 31536000, // seconds in a year
    },

    DATE: {
        REGEX: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d+Z$", // ISO8601 format
    },

    VERSION: {
        REGEX: "^v\\d+$",
    },

    ID: { // uuidv4
        SIZE: 36,
        REGEX: "^[a-z0-9][a-z0-9-]+$",
        UNKNOWN: '6b50b0c0-7df3-40d5-8a5f-51cd0141a084',
    },

    PUBLIC_ID: { // sha256
        SIZE: 64,
        REGEX: "^[a-z0-9]+$",
    },

    KEY: { // jwt
        REGEX: "^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]+$",
    },

    SLUG: {
        SHORTEST: 3,
        REASONABLE: 16,
        LONGEST: 32,
        CHARS: 'abcdefghijklmnopqrstuvwxyz0123456789_',
        VALID: ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'eiusmod', 'tempor', 'incididunt', 'labore', 'dolore', 'magna', 'aliqua', 'enim', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'dolor', 'reprehenderit'],
        INVALID: ['0-starts-with-number', '-starts-with-dash', 'has spaces', 'has_underscore', 'has-invalid-char!'],
    },

    NAME: {
        SHORTEST: 1,
        REASONABLE: 32,
        LONGEST: 64
    },

    DESCRIPTION: {
        SHORTEST: 1,
        REASONABLE: 64,
        LONGEST: 8192,
    },

    EMAIL: {
        LONGEST: 256,
        VALID: ['lorem1@ipsum.com', 'lorem2@ipsum.com', 'lorem3@ipsum.com', 'lorem4@ipsum.com', 'lorem5@ipsum.com', 'lorem6@ipsum.com', 'lorem7@ipsum.com', 'lorem8@ipsum.com'],
        INVALID: ['foo', 'foo@', '@bar.com', 'foo @ bar.com', 'foo@bar']
    },

    WEBHOOK: {
        VALID: ['http://www.foo.com/', 'http://www.example.com/foo/bar', 'http://foo.com/bar', 'https://foo.com/bar1/bar2', 'https://www.foo.org/?bar=catflap', 'https://www.foo.org:8000', 'https://www.foo.org:8000/?bar=catflap', 'http://localhost:8000'],
        INVALID: [
          ['foo', 'www.', '.com', 'http/:foo.com', 'http:// www.foo.com'],  // uri non conform
          ['ftp://foo.org', 'www.foo.org', 'foo.org', 'http:www.foo.com', 'http:/'] // regex non match
        ]
    },

    RECORDS: {
        MAXIMUM: 100,
        ITEM_MAXIMUM: 256
    },

    PROSE: 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum',

    POLICY: {
        ALLAREA: {
            ID: 'access-all-areas',
            DETAIL: {
                "name": "Access all areas",
                "description": "Access all entities in the catalog, no fields hidden",
                "policy": {
                    "access_control": {
                        "enabled": true,
                        "quota": {
                            "max_number": 24000,
                            "interval_type": "day"
                        },
                        "rate": 1000
                    },
                    "data_segment": {
                        "segment_query": {},
                        "field_masks": []
                    },
                    "legal_context": [{ "type": "attribution", "text": "test attribution", "link": "https://bit-broker.io" }]
                }
            }
        },
        EXAMPLE: {
            ID: 'example-policy',
            DETAIL: {
                "name": "An example policy",
                "description": "Access is restricted to countries only",
                "policy": {
                    "access_control": {
                       "enabled": true,
                       "quota": {
                           "max_number": 24000,
                           "interval_type": "day"
                       },
                       "rate": 1000
                    },
                    "data_segment": {
                        "segment_query": { "type": "country" },
                        "field_masks": ["movie.rating"]
                    },
                    "legal_context": [{ "type": "attribution", "text": "test attribution", "link": "https://bit-broker.io" }]
                }
            }
        },
        INVALID: {
            ID: 'invalid-policy',
            DETAIL: {
                "name": "An invalid policy",
                "description": "The policy details contain a number of errors",
                "policy": {
                    "access_control": {
                        "enabled": true,
                        "quota": {
                            "max_number": 24000,
                            "interval_type": "day"
                        },
                        "rate": 1000
                    },
                    "data_segment": {
                        "segment_query": { "type": "movie" },
                        "field_masks": ["movie.rating"]
                    },
                    "legal_context": [{ "type": "invalid_type", "text": "test attribution", "link": "https://bit-broker.io" }]
                }
            }
         }
    }
};

module.exports = DATA;
