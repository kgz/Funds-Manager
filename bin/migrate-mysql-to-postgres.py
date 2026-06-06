#!/usr/bin/env python3
"""Copy Funds Manager tables from MySQL to PostgreSQL via tab-separated pipe."""

from __future__ import annotations

import os
import subprocess
import sys
from urllib.parse import urlparse, unquote


def mysql_base_args(url: str) -> list[str]:
    parsed = urlparse(url)
    host = parsed.hostname or "127.0.0.1"
    port = str(parsed.port or 3306)
    user = unquote(parsed.username or "root")
    password = unquote(parsed.password or "")
    database = parsed.path.lstrip("/")
    args = ["mysql", "-h", host, "-P", port, "-u", user]
    if password:
        args.append(f"-p{password}")
    args.append(database)
    return args


def mysql_count(base: list[str], table: str) -> int:
    result = subprocess.run(
        [*base, "-N", "-B", "-e", f"SELECT COUNT(*) FROM `{table}`"],
        check=True,
        capture_output=True,
        text=True,
    )
    return int(result.stdout.strip())


def mysql_rows(base: list[str], query: str) -> list[list[str]]:
    result = subprocess.run(
        [*base, "-N", "-B", "-e", query],
        check=True,
        capture_output=True,
        text=True,
    )
    rows: list[list[str]] = []
    for line in result.stdout.splitlines():
        if not line:
            continue
        rows.append(line.split("\t"))
    return rows


def copy_escape(value: str) -> str:
    if value == "NULL":
        return "\\N"
    return (
        value.replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")
    )


def copy_table(
    postgres_url: str,
    table: str,
    columns: list[str],
    rows: list[list[str]],
) -> None:
    if not rows:
        print(f"{table}: 0 rows (skip)")
        return
    print(f"{table}: copying {len(rows)} rows...")
    col_list = ",".join(columns)
    lines = ["COPY " + table + " (" + col_list + ") FROM STDIN WITH (FORMAT text, NULL '\\N');"]
    for row in rows:
        lines.append("\t".join(copy_escape(cell) for cell in row))
    lines.append("\\.")
    payload = "\n".join(lines) + "\n"
    subprocess.run(
        ["psql", postgres_url, "-v", "ON_ERROR_STOP=1", "-q"],
        input=payload,
        check=True,
        text=True,
    )
    print(f"{table}: done")


def reset_sequences(postgres_url: str) -> None:
    sql = """
SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE((SELECT MAX(id) FROM categories), 1));
SELECT setval(pg_get_serial_sequence('category_mappings', 'id'), COALESCE((SELECT MAX(id) FROM category_mappings), 1));
SELECT setval(pg_get_serial_sequence('statement', 'id'), COALESCE((SELECT MAX(id) FROM statement), 1));
SELECT setval(pg_get_serial_sequence('transaction_data', 'id'), COALESCE((SELECT MAX(id) FROM transaction_data), 1));
SELECT setval(pg_get_serial_sequence('transaction_categories', 'id'), COALESCE((SELECT MAX(id) FROM transaction_categories), 1));
"""
    subprocess.run(
        ["psql", postgres_url, "-v", "ON_ERROR_STOP=1", "-q"],
        input=sql,
        check=True,
        text=True,
    )


TABLES: list[tuple[str, list[str], str]] = [
    (
        "categories",
        ["id", "name", "description", "parent_category_id", "created_at", "deleted_at", "colour"],
        "SELECT id, name, description, parent_category_id, created_at, deleted_at, colour FROM categories ORDER BY id",
    ),
    (
        "category_mappings",
        ["id", "pattern", "match_type", "category_id", "priority", "created_at", "updated_at"],
        "SELECT id, pattern, match_type, category_id, priority, created_at, updated_at FROM category_mappings ORDER BY id",
    ),
    (
        "statement",
        ["id", "date", "account_id", "opening_balance", "closing_balance", "deleted_at", "created_at"],
        "SELECT id, date, account_id, opening_balance, closing_balance, deleted_at, created_at FROM statement ORDER BY id",
    ),
    (
        "transaction_data",
        [
            "id",
            "statement_id",
            "category_id",
            "description",
            "amount",
            "transaction_date",
            "last_updated",
            "deleted_at",
            "created_at",
            "status",
            "balance",
        ],
        "SELECT id, statement_id, category_id, description, amount, transaction_date, last_updated, deleted_at, created_at, status, balance FROM transaction_data ORDER BY id",
    ),
    (
        "transaction_categories",
        ["id", "transaction_id", "category_id", "created_at"],
        "SELECT id, transaction_id, category_id, created_at FROM transaction_categories ORDER BY id",
    ),
]


def main() -> int:
    mysql_url = os.environ.get("MYSQL_URL", "mysql://root@127.0.0.1:3308/funds")
    postgres_url = os.environ.get(
        "POSTGRES_URL", "postgres://funds:funds@127.0.0.1:5434/funds"
    )
    base = mysql_base_args(mysql_url)

    for table, _cols, _query in TABLES:
        mysql_count(base, table)

    for table, columns, query in TABLES:
        rows = mysql_rows(base, query)
        copy_table(postgres_url, table, columns, rows)

    reset_sequences(postgres_url)
    return 0


if __name__ == "__main__":
    sys.exit(main())
