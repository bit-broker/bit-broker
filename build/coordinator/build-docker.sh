#!/bin/bash -e
# Syntax build-docker.sh [-i|--image imagename]

PROJECT=bitbroker- coordinator
DOCKER_IMAGE=${PROJECT}:latest
BASE_DOCKER_IMAGE=${PROJECT}:base

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
    -c|--code-coverage)
        CODE_COVERAGE=cc
        shift
        ;;
    -s|--static-analysis)
        STATIC_ANALYSIS=sa
        shift
        ;;
    *) # unknown
        echo Unknown Parameter $1
        exit 4
    esac
done


echo BUILDING DOCKER ${DOCKER_IMAGE}

docker build --no-cache \
    -t ${DOCKER_IMAGE} \
    -f build/coordinator/Dockerfile \
    .
