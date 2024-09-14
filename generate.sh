NODE_TLS_REJECT_UNAUTHORIZED=0 npx swagger-typescript-api -p https://localhost:2020/chaos/api/openapi.json -o ./src/apiClient --modular   --axios  --sort-routes

# NODE_TLS_REJECT_UNAUTHORIZED=0 openapi-ts -i https://localhost:2020/chaos/api/openapi.json -o src/client -c @hey-api/client-fetch
