# Use latest stable node alpine image
FROM node:15.13.0-alpine3.10

# Create bitbroker group and user
#RUN addgroup bitbroker && adduser bitbroker
RUN addgroup -S bitbroker \
 && adduser -S -D -s /sbin/nologin -h /home/node/app -G bitbroker bitbroker

# Create services services root folder and change permissions
RUN mkdir /home/node/app/services && \
    chown -R bitbroker:bitbroker /home/node/app/services

# Switch to bitbroker services root folder
WORKDIR /home/node/app/services


# Copy bitbroker registry server code, env config, lib/ locales directory and test directory and set ownership
COPY ./services/register register/
RUN chown -R bitbroker:bitbroker /home/node/app/services/register

COPY ./services/lib lib/
RUN chown -R bitbroker:bitbroker /home/node/app/services/lib

COPY ./services/locales locales/
RUN chown -R bitbroker:bitbroker /home/node/app/services/locales

COPY ./tests tests/
RUN chown -R bitbroker:bitbroker /home/node/app/services/tests

COPY .env.example /home/node/app/.env
RUN chown bitbroker:bitbroker /home/node/app/.env


# Copy docker entry point script (Placeholder for now)
COPY ./build/register-server/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chown bitbroker:bitbroker /usr/local/bin/docker-entrypoint.sh

# Create logs folder
WORKDIR /home/node/app/services/register
RUN mkdir -p ./logs && \
    chown -R bitbroker:bitbroker ./logs

#Set bitbroker non root user
USER bitbroker

#Run npm install and pull deps
WORKDIR /home/node/app/services/register
RUN npm install

EXPOSE 8001
ENTRYPOINT [ "docker-entrypoint.sh" ]
CMD ["npm","start"]