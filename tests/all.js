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

  The high level test runner, which executes all the scripts in the preferred
  order - use command 'node all'

  WARNING: Running this script will reset the entire database!

*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const Mocha = require('mocha');

// --- running contexts

var mocha = new Mocha();

// --- test case list in preferred order

mocha.addFile('./register.js');
//mocha.addFile('./connector.js');
//mocha.addFile('./session.js');
//mocha.addFile('./records.js');

// --- run the tests

mocha.run((failures) => {
    process.exitCode = failures ? 1 : 0;
});
