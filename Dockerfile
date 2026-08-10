# syntax=docker/dockerfile:1

FROM node:22-bookworm AS frontend
WORKDIR /build/frontend
RUN corepack enable && corepack prepare pnpm@11 --activate
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm run build:embed

FROM rust:1-bookworm AS builder
WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY app/Cargo.toml app/build.rs ./app/
COPY app/src ./app/src
COPY app/lib ./app/lib
COPY database/Cargo.toml database/diesel.toml ./database/
COPY database/migrations ./database/migrations
COPY database/src ./database/src
COPY crates/statement-parser ./crates/statement-parser
COPY crates/statement-parser-cli ./crates/statement-parser-cli
COPY crates/funds-release ./crates/funds-release
COPY --from=frontend /build/app/static ./app/static
RUN cargo build --release -p server_v2

FROM debian:bookworm-slim AS bundle
ARG VERSION=0.0.0
ARG TARGETARCH
RUN mkdir -p "/funds-manager-${VERSION}/lib"
COPY --from=builder /build/target/release/server_v2 "/funds-manager-${VERSION}/server_v2"
COPY --from=builder /build/app/lib/libpdfium.so "/funds-manager-${VERSION}/lib/libpdfium.so"
RUN printf '%s\n' \
	"Funds Manager ${VERSION} (linux-${TARGETARCH})" \
	"" \
	"1. Set DATABASE_URL" \
	"2. Run ./server_v2" \
	"3. Open http://127.0.0.1:2020" \
	"" \
	"PDFium: lib/libpdfium.so (set PDFIUM_LIBRARY_PATH=./lib/libpdfium.so if needed)" \
	> "/funds-manager-${VERSION}/README.txt"

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates libpq5 libstdc++6 \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /build/target/release/server_v2 /app/server_v2
COPY app/lib/libpdfium.so /app/lib/libpdfium.so

ENV SERVER_PORT=2020 \
	PDFIUM_LIBRARY_PATH=/app/lib/libpdfium.so \
	RUST_LOG=info

EXPOSE 2020
ENTRYPOINT ["/app/server_v2"]
