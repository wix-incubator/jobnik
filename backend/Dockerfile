# Build Stage
FROM --platform=$BUILDPLATFORM golang:1.23.1-alpine AS builder

# Set the target architecture
ARG TARGETOS
ARG TARGETARCH

WORKDIR /app

# Copy go.mod and go.sum
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the application for the target architecture
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o main .

# Final Stage
FROM alpine:latest

WORKDIR /root/

# Copy the binary from the builder stage
COPY --from=builder /app/main .

# Expose port 8080
EXPOSE 8080

# Command to run the executable
CMD ["./main"]