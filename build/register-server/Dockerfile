FROM node:15.13.0-alpine3.10
WORKDIR /home/node/app
COPY ./register register/
WORKDIR /home/node/app/register
RUN npm install

COPY ./tests tests/

COPY ./build/register-server/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8090
ENTRYPOINT [ "docker-entrypoint.sh" ]
CMD ["npm","start"]