#!/bin/bash -e
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
