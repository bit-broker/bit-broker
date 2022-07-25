# Database Script File Naming

The sql files in this directory are named such that they start with a version label, with the expectation that they will be applied in order of ascending version label.

We are using Flyway to handle DB migrations for deployments, however some of the db scripts need to be applied on database start-up i.e. prior to flyway (due to permissions).

The V0.x scripts have been deliberately named without '\_' following the version so that Flyway will not try to run them as migrations; in docker compose they are volume mounted into the postgres container docker-entrypoint-initdb.d directory so that they are run at startup. In k8s / helm they are effectively run as a post-install-setup via bbk-postgres-init

V1.X\_\_ and later labelled sql files will be migrated by flyway in both docker-compose and k8s / helm.
