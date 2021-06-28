# --- core services

docker build --no-cache \
    -t bbk-consumer:latest \
    -f ./build/consumer/Dockerfile \
    .
docker build --no-cache \
    -t bbk-contributor:latest \
    -f ./build/contributor/Dockerfile \
    .
docker build --no-cache \
    -t bbk-coordinator:latest \
    -f ./build/coordinator/Dockerfile \
    .

# --- ancillary services

cd ..
./bit-broker/build/rate-limit/build-docker.sh
./bit-broker/build/auth-service/build-docker.sh
cd bit-broker
