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

  The bit-broker database unit test user. NOTE: this script and user are NOT
  to be deployed in production environments.

*/

\connect bit_broker

DROP USER IF EXISTS bbk_tests;
CREATE USER bbk_tests WITH ENCRYPTED PASSWORD 'bbk_tests_pwd';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bbk_tests;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bbk_tests;
