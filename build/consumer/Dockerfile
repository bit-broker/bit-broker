# Use latest stable node alpine image
FROM node:16-alpine3.12

# Create bitbroker group and user
RUN addgroup -S bitbroker -g 1999\
    && adduser -S -D -s /sbin/nologin -h /home/node/app -u 1999 -G bitbroker bitbroker

# Create services root folder and change permissions
RUN mkdir /home/node/app/services && \
    chown -R bitbroker:bitbroker /home/node/app/services

# Switch to bitbroker services root folder
WORKDIR /home/node/app/services

# Copy bitbroker consumer code, lib and locales directory and set ownership
COPY ./services/consumer consumer/
RUN chown -R bitbroker:bitbroker /home/node/app/services/consumer

COPY ./services/lib lib/
RUN chown -R bitbroker:bitbroker /home/node/app/services/lib

COPY ./services/locales locales/
RUN chown -R bitbroker:bitbroker /home/node/app/services/locales

# Add default env
COPY .env.example /home/node/app/.env
RUN chown bitbroker:bitbroker /home/node/app/.env

# Set bitbroker non root user
USER bitbroker

# Run npm install and pull deps
WORKDIR /home/node/app/services/consumer
RUN npm install

EXPOSE 8003
CMD ["npm", "start"]
