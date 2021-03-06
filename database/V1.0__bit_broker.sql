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
The bit-broker database creation script. Contains all tables, keys, indexes,
constrains, enums, users, roles, grants, etc.
*/

\connect bit_broker

-- user table

CREATE TABLE users
(
    id SERIAL PRIMARY KEY,
    email VARCHAR (256) UNIQUE NOT NULL,
    properties JSONB NOT NULL,
    coordinator_key_id CHAR(36) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- entity table

CREATE TABLE entity
(
    id SERIAL PRIMARY KEY,
    slug VARCHAR (32) UNIQUE NOT NULL,
    properties JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entity_slug ON entity (slug);

-- connector table

CREATE TYPE session_modes AS ENUM ('accrue', 'stream', 'replace');

CREATE TABLE connector
(
    id SERIAL PRIMARY KEY,
    entity_id SERIAL NOT NULL REFERENCES entity (id) ON DELETE CASCADE,
    slug VARCHAR (32) UNIQUE NOT NULL,
    properties JSONB NOT NULL,
    contribution_id CHAR(40) UNIQUE,
    contribution_key_id CHAR(36) UNIQUE NOT NULL,
    is_live BOOLEAN NOT NULL DEFAULT FALSE,
    session_id CHAR(36) UNIQUE,
    session_mode SESSION_MODES,
    session_started TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (entity_id, slug)
);

CREATE INDEX idx_connector_slug ON connector (slug);
CREATE INDEX idx_connector_entity_id ON connector (entity_id);
CREATE INDEX idx_connector_contribution_id ON connector (contribution_id);
CREATE INDEX idx_connector_session_id ON connector (session_id);

-- catalog table

CREATE TABLE catalog
(
    id SERIAL PRIMARY KEY,
    public_id CHAR(40) NOT NULL UNIQUE,
    connector_id SERIAL NOT NULL REFERENCES connector (id) ON DELETE CASCADE,
    vendor_id VARCHAR(256) NOT NULL,
    record JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (connector_id, vendor_id)
);

CREATE INDEX idx_catalog_public_id ON catalog (public_id);
CREATE INDEX idx_catalog_vendor_id ON catalog (vendor_id);
CREATE INDEX idx_catalog_connector_id ON catalog (connector_id);

-- operation table

CREATE TYPE operation_actions AS ENUM ('upsert', 'delete');

CREATE TABLE operation
(
    id SERIAL PRIMARY KEY,
    session_id CHAR(36) NOT NULL REFERENCES connector (session_id) ON DELETE CASCADE,
    set_id CHAR(36) NOT NULL,
    public_id CHAR(40) NOT NULL,
    action OPERATION_ACTIONS NOT NULL,
    record JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_operation_session_id ON operation (session_id);

-- policy table

CREATE TABLE policy
(
    id SERIAL PRIMARY KEY,
    slug VARCHAR (32) UNIQUE NOT NULL,
    properties JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_policy_slug ON policy (slug);

-- access table - users 0..* <---> policy 0..*

CREATE TABLE access
(
    id SERIAL PRIMARY KEY,
    user_id SERIAL REFERENCES users (id) ON DELETE CASCADE,
    policy_id SERIAL REFERENCES policy (id) ON DELETE CASCADE,
    key_id CHAR(36) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, policy_id)
);

CREATE INDEX idx_access_user ON access (user_id);
CREATE INDEX idx_access_policy ON access (policy_id);

-- grant permissions - TODO allocate more specific grants based on each user

GRANT SELECT ON ALL TABLES IN SCHEMA public TO bbk_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bbk_writer;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bbk_writer;
