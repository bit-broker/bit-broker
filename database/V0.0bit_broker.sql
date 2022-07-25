-- Copyright 2021 Cisco and its affiliates
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
--      http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.
--
-- SPDX-License-Identifier: Apache-2.0

/*
A script to clear out an existing bit-broker database
*/

\connect postgres

-- set output context

SET client_min_messages = warning;

-- clean up any previous assets - for development only

DROP DATABASE IF EXISTS bit_broker;

DROP USER IF EXISTS bbk_admin;
DROP USER IF EXISTS bbk_coordinator;
DROP USER IF EXISTS bbk_contributor;
DROP USER IF EXISTS bbk_consumer;

DROP ROLE IF EXISTS bbk_reader;
DROP ROLE IF EXISTS bbk_writer;
