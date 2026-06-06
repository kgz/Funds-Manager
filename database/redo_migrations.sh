#!/bin/bash

# Script to undo all Diesel migrations and re-run them.

# Navigate to the directory containing the migrations
cd /mnt/dev/my_funds/database

# Check if diesel_cli is installed, and prompt to install if it is not
if ! command -v diesel >/dev/null 2>&1; then
  echo "diesel_cli is not installed. Please install it using:"
  echo "cargo install diesel_cli --no-default-features --features mysql"
  exit 1
fi

echo "Undoing all Diesel migrations..."
# Undo all migrations
diesel migration revert --all

echo "Running all Diesel migrations..."
# Re-run all migrations
diesel migration run

echo "Migrations have been reset and re-run."
