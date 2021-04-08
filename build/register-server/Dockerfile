# Use latest stable node alpine image
FROM node:15.13.0-alpine3.10

# Create bitbroker group and user
#RUN addgroup bitbroker && adduser bitbroker
RUN addgroup -S bitbroker \
 && adduser -S -D -s /sbin/nologin -h /home/node/app -G bitbroker bitbroker

# Use default node folders
WORKDIR /home/node/app

# Copy bitbroker registry server code, env config, lib and test directory and set ownership
COPY ./register register/
RUN chown -R bitbroker:bitbroker /home/node/app/register

COPY ./lib lib/
RUN chown -R bitbroker:bitbroker /home/node/app/lib

COPY .env.example .env
RUN chown bitbroker:bitbroker /home/node/app/.env

COPY ./tests tests/
RUN chown -R bitbroker:bitbroker /home/node/app/tests

# Copy docker entry point script (Placeholder for now)
COPY ./build/register-server/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chown bitbroker:bitbroker /usr/local/bin/docker-entrypoint.sh

#Set bitbroker non root user
USER bitbroker

#Run npm install and pull deps
WORKDIR /home/node/app/register
RUN npm install

EXPOSE 8001
ENTRYPOINT [ "docker-entrypoint.sh" ]
CMD ["npm","start"]