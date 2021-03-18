
\connect postgres

DROP DATABASE IF EXISTS bitbroker;
DROP USER IF EXISTS bitbroker;

CREATE USER bitbroker WITH ENCRYPTED PASSWORD 'bitbroker';
CREATE DATABASE bitbroker WITH ENCODING = 'UTF8' OWNER = bitbroker;

\connect bitbroker

-- TODO: add DELETE CASCADE?

CREATE TABLE entities
(
    id SERIAL PRIMARY KEY,
    name VARCHAR (255) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- TODO: not sure how to do best practice user management yet

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bitbroker;

-- TODO: obviously the below INSERT is just temporary

INSERT
  INTO entities (name)
VALUES ('car_park'), ('bus_stop'), ('school'), ('crime');
