#!/bin/bash
curl --insecure  --http1.1 https://consumerdatastandardsaustralia.github.io/standards/includes/swagger/cds_banking.json > openapi.json
sudo rm -rf src/client;


docker run --rm \
  -v ${PWD}:/local \
  -e JAVA_OPTS="-Dio.swagger.parser.util.RemoteUrl.trustAll=true -Dio.swagger.v3.parser.util.RemoteUrl.trustAll=true" \
   openapitools/openapi-generator-cli generate -i ./local/openapi.json -g typescript-fetch -o ./local/src/client
sudo chown -R ${USER} src/client
