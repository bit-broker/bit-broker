#!/bin/bash -e
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

# Syntax build-docker.sh [-i|--image imagename]

# Global vars
######################################################################
CONTRIBUTOR_IMAGE="bbkr/bbk-contributor:latest"
COORDINATOR_IMAGE="bbkr/bbk-coordinator:latest"
CONSUMER_IMAGE="bbkr/bbk-consumer:latest"
DOCKER_BASE_FOLDER="./build/"
######################################################################

# Get command
while [[ $# -gt 0 ]]
do
    key="${1}"

    case ${key} in
    -i|--image)
        DOCKER_IMAGE="${2}"
        shift;shift
        ;;
    -h|--help)
        less README.md
        exit 0
        ;;
    *) # unknown
        echo Unknown Parameter $1
        exit 4
    esac
done

echo BUILDING DOCKER ${CONTRIBUTOR_IMAGE}

docker build \
    -t ${CONTRIBUTOR_IMAGE} \
    -f ${DOCKER_BASE_FOLDER}contributor/Dockerfile \
    .

echo BUILDING DOCKER ${CONSUMER_IMAGE}

docker build \
    -t ${CONSUMER_IMAGE} \
    -f ${DOCKER_BASE_FOLDER}consumer/Dockerfile \
    .

echo BUILDING DOCKER ${COORDINATOR_IMAGE}

docker build \
    -t ${COORDINATOR_IMAGE} \
    -f ${DOCKER_BASE_FOLDER}coordinator/Dockerfile \
    .
