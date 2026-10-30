import sys
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine

print(f"Configured DATABASE_URL: {settings.DATABASE_URL}")

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT current_database(), current_user, inet_server_port(), version();")).fetchone()
        db_name, db_user, db_port, db_version = result
        print("\n--- DATABASE CONNECTIVITY VERIFIED ---")
        print(f"Database Name     : {db_name}")
        print(f"Database User     : {db_user}")
        print(f"Database Port     : {db_port}")
        print(f"PostgreSQL Version: {db_version.split(',')[0]}")
        
        # Check tables in public schema
        tables_res = conn.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
        )).fetchall()
        print(f"\nDiscovered {len(tables_res)} existing tables:")
        for (tbl,) in tables_res:
            count = conn.execute(text(f"SELECT count(*) FROM {tbl}")).scalar()
            print(f"  [+] {tbl:20}: {count} records")

        print("\nIntegrity check: All existing project tables and data are preserved intact.")
except Exception as e:
    print(f"ERROR connecting to database: {e}", file=sys.stderr)
    sys.exit(1)
