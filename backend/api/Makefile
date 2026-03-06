.PHONY: build docker clean

build:
	go build -o api-server .

docker:
	docker build -t beacon-api .

clean:
	rm -f api-server
