.PHONY: build zip clean

build:
	GOOS=linux GOARCH=amd64 go build -tags lambda.norpc -o bootstrap .

zip: build
	zip function.zip bootstrap

clean:
	rm -f bootstrap function.zip
