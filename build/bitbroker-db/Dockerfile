FROM postgres:13.2

# Add some development tools (To be removed)
RUN apk --no-cache add curl && apk --no-cache add busybox-extras

COPY ./database/schema.sql /docker-entrypoint-initdb.d/init.sql