# Copyright 2022 Cisco and its affiliates
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# SPDX-License-Identifier: Apache-2.0

# Use latest stable node alpine image
FROM node:17-alpine3.12

# Create bitbroker group and user
RUN addgroup -S bitbroker -g 1999\
    && adduser -S -D -s /sbin/nologin -h /home/node/app -u 1999 -G bitbroker bitbroker

# Create services root folder and change permissions
RUN mkdir /home/node/app/services && \
    chown -R bitbroker:bitbroker /home/node/app/services

# Switch to bitbroker services root folder
WORKDIR /home/node/app/services

# Copy bitbroker coordinator code, lib and locales directory and set ownership
COPY ./services/coordinator coordinator/
RUN chown -R bitbroker:bitbroker /home/node/app/services/coordinator

COPY ./services/lib lib/
RUN chown -R bitbroker:bitbroker /home/node/app/services/lib

COPY ./services/locales locales/
RUN chown -R bitbroker:bitbroker /home/node/app/services/locales

COPY ./tests tests/
RUN chown -R bitbroker:bitbroker /home/node/app/services/tests

# Add default env
COPY .env.example /home/node/app/.env
RUN chown bitbroker:bitbroker /home/node/app/.env

# Set bitbroker non root user
USER bitbroker

#Run npm install and pull deps
WORKDIR /home/node/app/services/coordinator
RUN npm install

EXPOSE 8001
CMD ["npm", "start"]
