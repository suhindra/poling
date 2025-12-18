.PHONY: build run test clean deps

deps:
	go mod download
	go mod tidy

build:
	go build -o bin/poling-api ./cmd

run: build
	./bin/poling-api

dev:
	go run ./cmd

test:
	go test ./...

clean:
	rm -rf bin/
	go clean
