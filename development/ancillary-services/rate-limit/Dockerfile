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

FROM golang:1.16.4-alpine3.13

# Copy source code
WORKDIR /home/rate-service
COPY ./rate-service/ .
COPY ./bit-broker/.env.example .env

# Environment
ENV REDIS_ADDR=bbk-rate-limit-cache:6380
ENV REDIS_PASSWORD =
ENV REDIS_DB=0
ENV SERVER_HTTP_HOST=0.0.0.0:4000
ENV SERVER_GRPC_HOST=0.0.0.0:7000
ENV GO_ENV=development
ENV LOG_LEVEL=DebugLevel
ENV POLICY_SERVICE=http://bbk-coordinator:8001/v1
ENV POLICY_SERVICE_AUTHORIZATION=Bearer
ENV POLICY_SERVICE_TIMEOUT=5

# Build and run
RUN go build -o rate-service main.go

# Run
CMD /home/rate-service/rate-service
