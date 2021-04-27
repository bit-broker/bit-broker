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

  The bit-broker database creation script. Contains all tables, keys, indexes,
  constrains, enums, users, roles, grants, etc.

*/

\connect postgres

-- clean up any previous assets - for development only

DROP DATABASE IF EXISTS bitbroker;

DROP USER IF EXISTS bbk_adm;
DROP USER IF EXISTS bbk_api;
DROP USER IF EXISTS bbk_www;

DROP ROLE IF EXISTS bbk_reader;
DROP ROLE IF EXISTS bbk_writer;

-- create the user and role assets

CREATE ROLE bbk_reader;
CREATE ROLE bbk_writer;

CREATE USER bbk_adm WITH ENCRYPTED PASSWORD 'bbk_adm_pwd';
CREATE USER bbk_api WITH ENCRYPTED PASSWORD 'bbk_api_pwd';
CREATE USER bbk_www WITH ENCRYPTED PASSWORD 'bbk_www_pwd';

GRANT bbk_reader TO bbk_www;
GRANT bbk_writer TO bbk_adm, bbk_api;

-- create the database

CREATE DATABASE bitbroker WITH ENCODING = 'UTF8' OWNER = bbk_adm;

\connect bitbroker

-- entity table

CREATE TABLE entity
(
    id SERIAL PRIMARY KEY,
    name VARCHAR (64) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entity_name ON entity (name);

-- connector table

CREATE TYPE session_modes AS ENUM ('accrue', 'stream', 'replace');

CREATE TABLE connector
(
    id SERIAL PRIMARY KEY,
    entity_id SERIAL NOT NULL REFERENCES entity (id) ON DELETE CASCADE,
    name VARCHAR (64) NOT NULL,
    description TEXT NOT NULL,
    contribution_id CHAR(36) UNIQUE,
    contribution_key CHAR(36),
    webhook VARCHAR(256),
    cache INTEGER NOT NULL,
    session_id CHAR(36) UNIQUE,
    session_mode SESSION_MODES,
    session_started TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (entity_id, name)
);

CREATE INDEX idx_connector_name ON connector (name);
CREATE INDEX idx_connector_entity_id ON connector (entity_id);
CREATE INDEX idx_connector_contribution_id ON connector (contribution_id);
CREATE INDEX idx_connector_session_id ON connector (session_id);

-- catalog table

CREATE TABLE catalog
(
    id SERIAL PRIMARY KEY,
    connector_id SERIAL NOT NULL REFERENCES connector (id) ON DELETE CASCADE,
    vendor_id VARCHAR(256) NOT NULL,
    name VARCHAR (256) NOT NULL,
    record JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (connector_id, vendor_id)
);

CREATE INDEX idx_catalog_vendor_id ON catalog (vendor_id);
CREATE INDEX idx_catalog_name ON catalog (name);
CREATE INDEX idx_catalog_connector_id ON catalog (connector_id);

-- operation table

CREATE TYPE operation_actions AS ENUM ('upsert', 'delete');

CREATE TABLE operation
(
    id SERIAL PRIMARY KEY,
    session_id CHAR(36) NOT NULL REFERENCES connector (session_id) ON DELETE CASCADE,
    action OPERATION_ACTIONS NOT NULL,
    record JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_operation_session_id ON operation (session_id);

-- grant database permissions

GRANT SELECT ON ALL TABLES IN SCHEMA public TO bbk_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bbk_writer;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bbk_writer;
