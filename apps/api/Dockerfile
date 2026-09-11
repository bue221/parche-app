FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/parche-api ./cmd/parche-api

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=build /out/parche-api /usr/local/bin/parche-api
COPY migrations ./migrations
USER nobody
EXPOSE 8080
ENTRYPOINT ["parche-api"]
CMD ["serve"]
