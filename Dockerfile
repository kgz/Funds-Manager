# syntax=docker/dockerfile:1

FROM node:22-bookworm AS frontend
WORKDIR /build/frontend
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm run build:embed

FROM rust:1-bookworm AS builder
WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY app/Cargo.toml app/Cargo.lock app/build.rs ./app/
COPY app/src ./app/src
COPY app/lib ./app/lib
COPY database/Cargo.toml database/Cargo.lock database/diesel.toml ./database/
COPY database/migrations ./database/migrations
COPY database/src ./database/src
COPY crates/statement-parser ./crates/statement-parser
COPY crates/statement-parser-cli ./crates/statement-parser-cli
COPY --from=frontend /build/app/static ./app/static
RUN cargo build --release -p server_v2

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates libstdc++6 \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /build/target/release/server_v2 /app/server_v2
COPY app/lib/libpdfium.so /app/lib/libpdfium.so

ENV SERVER_PORT=2020 \
	PDFIUM_LIBRARY_PATH=/app/lib/libpdfium.so \
	RUST_LOG=info

EXPOSE 2020
ENTRYPOINT ["/app/server_v2"]
