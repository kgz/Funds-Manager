#!/bin/bash
curl --insecure  --http1.1 https://localhost:2020/chaos/api/openapi.json > openapi.json
rm -rf client;

docker run --rm \
  -v ${PWD}:/local \
  -e JAVA_OPTS="-Dio.swagger.parser.util.RemoteUrl.trustAll=true -Dio.swagger.v3.parser.util.RemoteUrl.trustAll=true" \
   openapitools/openapi-generator-cli generate -i ./local/openapi.json -g typescript-axios --skip-validate-spec -o ./local/client
