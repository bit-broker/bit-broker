
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

CREATE TABLE connector
(
    id SERIAL PRIMARY KEY,
    entity_id SERIAL NOT NULL REFERENCES entity (id) ON DELETE CASCADE,
    name VARCHAR (64) NOT NULL,
    description TEXT NOT NULL,
    contribution_id CHAR(36),
    contribution_key CHAR(36),
    webhook VARCHAR(255),
    cache INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (entity_id, name)
);

CREATE INDEX idx_connector_name ON connector (name);
CREATE INDEX idx_connector_entity_id ON connector (entity_id);
CREATE INDEX idx_connector_contribution_id ON connector (contribution_id);

-- grant database permissions

GRANT SELECT ON ALL TABLES IN SCHEMA public TO bbk_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bbk_writer;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bbk_writer;

-- TODO: obviously the below INSERTs are just temporary

INSERT
  INTO entity (name, description)
VALUES ('car_park','xxx'), ('bus_stop','xxx'), ('school','xxx'), ('crime','xxx');

INSERT
  INTO connector (name, description, cache, entity_id)
SELECT 'nhs', 'xxx', 0, id FROM entity WHERE name = 'car_park';

INSERT
  INTO connector (name, description, cache, entity_id)
SELECT 'ncp', 'xxx', 0, id FROM entity WHERE name = 'car_park';

INSERT
  INTO connector (name, description, cache, entity_id)
SELECT 'mcc', 'xxx', 0, id FROM entity WHERE name = 'car_park';

INSERT
  INTO connector (name, description, cache, entity_id)
SELECT 'metro', 'xxx', 0, id FROM entity WHERE name = 'bus_stop';

INSERT
  INTO connector (name, description, cache, entity_id)
SELECT 'tram_co', 'xxx', 0, id FROM entity WHERE name = 'bus_stop';
