
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

CREATE USER bbk_adm WITH ENCRYPTED PASSWORD 'bbk_adm';
CREATE USER bbk_api WITH ENCRYPTED PASSWORD 'bbk_api';
CREATE USER bbk_www WITH ENCRYPTED PASSWORD 'bbk_www';

GRANT bbk_reader TO bbk_www;
GRANT bbk_writer TO bbk_adm, bbk_api;

-- create the database

CREATE DATABASE bitbroker WITH ENCODING = 'UTF8' OWNER = bbk_adm;

\connect bitbroker

-- register table

CREATE TABLE register
(
    id SERIAL PRIMARY KEY,
    name VARCHAR (255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
--  TODO: deleted_at - logical delete?
--  TODO: add a DELETE CASCADE?
);

-- grant database permissions

GRANT SELECT ON ALL TABLES IN SCHEMA public TO bbk_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bbk_writer;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bbk_writer;

-- TODO: obviously the below INSERT is just temporary

INSERT
  INTO register (name, description)
VALUES ('car_park','xxx'), ('bus_stop','xxx'), ('school','xxx'), ('crime','xxx');
