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
The bit-broker database intialisation script.
*/

\connect postgres

-- create the user and role assets

CREATE ROLE bbk_reader;
CREATE ROLE bbk_writer;

CREATE USER bbk_admin WITH ENCRYPTED PASSWORD 'bbk_admin_pwd';
CREATE USER bbk_coordinator WITH ENCRYPTED PASSWORD 'bbk_coordinator_pwd';
CREATE USER bbk_contributor WITH ENCRYPTED PASSWORD 'bbk_contributor_pwd';
CREATE USER bbk_consumer WITH ENCRYPTED PASSWORD 'bbk_consumer_pwd';

GRANT bbk_reader TO bbk_consumer;
GRANT bbk_writer TO bbk_admin, bbk_coordinator, bbk_contributor;

-- create the database

CREATE DATABASE bit_broker WITH ENCODING = 'UTF8' OWNER = bbk_admin;

-- create extensions

\connect bit_broker

CREATE EXTENSION postgis;
