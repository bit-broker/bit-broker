# --- core services

./build/coordinator/build-docker.sh
./build/contributor/build-docker.sh
./build/consumer/build-docker.sh

# --- ancillary services

cd ..
./bit-broker/build/rate-limit/build-docker.sh
./bit-broker/build/auth-service/build-docker.sh
cd bit-broker
