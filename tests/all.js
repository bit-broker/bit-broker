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
The high level test runner, which executes all the scripts in the preferred
order - use command 'node start'

WARNING: Running this script will reset the entire database!
*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const Mocha = require('mocha');

// --- running contexts

var mocha = new Mocha();

// --- test case list in preferred order - do NOT include the 'seed' script as this is for developmemnt testing only

mocha.addFile('./coordinator.js');
mocha.addFile('./search.js');
mocha.addFile('./contributor.js');
mocha.addFile('./sessions.js');
mocha.addFile('./consumer.js');
mocha.addFile('./policy.js');
mocha.addFile('./user.js');
mocha.addFile('./access.js');

/* NOTE: The tests below here are materially different from earlier ones.
         They are end2end test designed to be run on a complete deployed
         system. They will still work on a development system, but here
         many tests cases will be skipped. Use the .env setting
         process.env.TESTS_LOCAL_MODE to state you are test in development
         mode only. */

mocha.addFile('./end2end.js');

// --- run the tests

mocha.run(failures => {
    process.exitCode = failures ? 1 : 0;
});
