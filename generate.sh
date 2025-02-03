#!/bin/bash
curl https://localhost:2020/chaos/api/openapi.json > openapi.json && rm -rf src/Api && NODE_TLS_REJECT_UNAUTHORIZED=0 openapi-generator-cli generate -i ./openapi.json -g typescript-axios -o src/Api --server-variables=host=https://localhost:2020/chaos --additional-properties=enumPropertyNaming=snake_case,paramNaming-snake_case,withSeparateModelsAndApi=true,apiPackage=rest_api,modelPackage=RestModels,useSingleRequestParameter=false,supportsES6=false
 
