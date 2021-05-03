# Use latest stable node alpine image
FROM node:15.13.0-alpine3.10

# Create bitbroker group and user
#RUN addgroup bitbroker && adduser bitbroker
RUN addgroup -S bitbroker \
 && adduser -S -D -s /sbin/nologin -h /home/node/app -G bitbroker bitbroker

# Add some development tools (To be removed)
RUN apk --no-cache add curl && apk --no-cache add busybox-extras

# Create services services root folder and change permissions
RUN mkdir /home/node/app/services && \
    chown -R bitbroker:bitbroker /home/node/app/services


# Switch to bitbroker services root folder
WORKDIR /home/node/app/services

# Copy docker entry point script (Placeholder for now)
COPY ./build/coordinator/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chown bitbroker:bitbroker ./docker-entrypoint.sh
RUN ["chmod", "+x", "./docker-entrypoint.sh"]

# Copy bitbroker coordinator code, env config, lib/ locales directory and test directory and set ownership
COPY ./services/coordinator coordinator/
RUN chown -R bitbroker:bitbroker /home/node/app/services/coordinator

COPY ./services/lib lib/
RUN chown -R bitbroker:bitbroker /home/node/app/services/lib

COPY ./services/locales locales/
RUN chown -R bitbroker:bitbroker /home/node/app/services/locales

COPY ./tests tests/
RUN chown -R bitbroker:bitbroker /home/node/app/services/tests

COPY .env.example /home/node/app/.env
RUN chown bitbroker:bitbroker /home/node/app/.env



# Create logs folder
WORKDIR /home/node/app/services/coordinator
RUN mkdir -p ./logs && \
    chown -R bitbroker:bitbroker ./logs

#Set bitbroker non root user
USER bitbroker

#Run npm install and pull deps
WORKDIR /home/node/app/services/coordinator
RUN npm install

EXPOSE 8001
ENTRYPOINT [ "/home/node/app/services/docker-entrypoint.sh" ]
CMD ["npm","start"]