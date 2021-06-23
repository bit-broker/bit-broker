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

# Build and run
RUN go build -o rate-service main.go

# Run
CMD /home/rate-service/rate-service
