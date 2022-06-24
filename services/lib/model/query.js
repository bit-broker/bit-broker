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
Converts a consumer API query string to a postgres where clause
*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const convert = require('mongo-query-to-postgres-jsonb');
const keys = require('json-keys-sort');

// --- constants

const MODS_BEFORE = [ // the order of this array is important
    {
        regex: /"\$contains"/,
        replace: '"$elemMatch"'
    }
];

const MODS_AFTER = [ // the order of this array is important
    {
        regex: /\b(record[^=]+)='\{"\$near":\{"\$geometry":(\{[^}]+\}),"\$max":([\d]+),"\$min":(\d+)\}\}'::jsonb/,
        replace: " (ST_Distance(ST_GeomFromGeoJSON($1)::geography, ST_GeomFromGeoJSON('$2')::geography, false) BETWEEN $4 AND $3) "
    },
    {
        regex: /\b(record[^=]+)='\{"\$near":\{"\$geometry":(\{[^}]+\}),"\$max":([\d]+)\}\}'::jsonb/,
        replace: " (ST_Distance(ST_GeomFromGeoJSON($1)::geography, ST_GeomFromGeoJSON('$2')::geography, false) < $3) " // ,true TODO?
    },
    {
        regex: /\b(record[^=]+)='\{"\$near":\{"\$geometry":(\{[^}]+\}),"\$min":(\d+)\}\}'::jsonb/,
        replace: " (ST_Distance(ST_GeomFromGeoJSON($1)::geography, ST_GeomFromGeoJSON('$2')::geography, false) > $3) "
    },
    {
        regex: /\b(record[^=]+)='\{"\$within":\{"\$geometry":(\{[^}]+\})\}\}'::jsonb/,
        replace: " (ST_Within(ST_GeomFromGeoJSON($1)::geometry , ST_GeomFromGeoJSON('$2')::geometry )) = TRUE"
    },
    {
        regex: /\?/,
        replace: '\\?'
    }
];

const ALLOWED = [ 'and', 'contains', 'eq', 'geometry', 'gt', 'gte', 'in', 'lt', 'lte','max','min', 'ne', 'near', 'nin', 'nor', 'not', 'options', 'or', 'regex', 'within' ];

// --- query class (exported)

module.exports = class Query {

    // --- deep iterates every item in an object

    static each_value(object, cb) {
        if (object) {
            for (var key in object) {
                if (typeof object[key] === 'object') {
                    this.each_value(object[key], cb);
                } else {
                    object[key] = cb(object[key]);
                }
            }
        }
    }

    // --- checks all functions are in scope for what is supported in the allowed list

    static scoped(query) { // query as received as a string
        let scoped = true;
        let keys = query.matchAll(/"\$(\w+)"/g);  // all actionable keys of the form "$xxx" - TODO what if a user's value string starts with a '$'?

        for (let key of keys) {
            if (!ALLOWED.includes(key[1])) { // 1 = the regex matching group
                scoped = false;
                break
            }
        }

        return scoped;
    }

    // --- executes an ordered set of regex modifications

    static modify(text, mods) {
        for (let i = 0; i < mods.length; i++) {
            text = text.replace(mods[i].regex, mods[i].replace);
        }
        return text;
    }

    // --- escapes all quotes in all strings

    static escape_strings(query) {
        Query.each_value(query, item => {
            return typeof item === 'string' ? item.replace(/'/g, "''").replace(/\"/g, "\\\"") : item;
        });
    }

    // --- convert a query string to a postgres where clause (via mongo query syntax)

    static process(query, column = 'record') {
        let result = { valid: true, where: 'FALSE' };

        try {
            Query.escape_strings(query);
            query = keys.sort(query); // we must use sort for regex matching to be in a consistent order
            query = JSON.stringify(query);
            query = Query.modify(query, MODS_BEFORE);
            query = JSON.parse(query);
            query = keys.sort(query); // resort after serialisation

            result.where = convert(column, query);
            result.where = Query.modify(result.where, MODS_AFTER);

            // --- the line below is a workaround for https://github.com/thomas4019/mongo-query-to-postgres-jsonb/issues/28
            result.where = result.where.replaceAll(/'\(\?([^\)]+)\)/g, "'(\\?$1)"); // i.e. '(?p) => '(\?p)

        } catch (err) {
            result = { valid: false, where: 'FALSE' };
        }

        return result;
    }
}
