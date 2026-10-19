import json
import sqlite3
import sys
from pathlib import Path


TABLES = (
    "User",
    "Course",
    "Assignment",
    "Task",
    "EnergyLog",
    "Proof",
    "ModeLog",
    "GoodieGrab",
)


def main():
    database = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("db") / "custom.db"
    if not database.is_file():
        raise FileNotFoundError(f"SQLite database not found: {database}")

    connection = sqlite3.connect(f"{database.resolve().as_uri()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        available = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        missing = [table for table in TABLES if table not in available]
        if missing:
            raise RuntimeError(f"SQLite database is missing tables: {', '.join(missing)}")

        data = {
            table: [
                dict(row)
                for row in connection.execute(f'SELECT * FROM "{table}"')
            ]
            for table in TABLES
        }
        json.dump(data, sys.stdout, separators=(",", ":"))
        sys.stdout.write("\n")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
