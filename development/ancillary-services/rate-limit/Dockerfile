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
