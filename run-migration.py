#!/usr/bin/env python3
"""
Migration Script: Add Revolico Import Fields
Adds source, revolicoId, scrapedAt fields and makes sellerId nullable
"""

import os
import sys

# Read DATABASE_URL from environment or use default
database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/cuba_marketplace')

print('Starting migration for Revolico import fields...')
print(f'Database: {database_url.split("@")[-1] if "@" in database_url else "local"}')

# Read SQL file
with open('migrate.sql', 'r') as f:
    sql = f.read()

# Use psycopg2 if available, otherwise use subprocess
try:
    import psycopg2

    conn = psycopg2.connect(database_url)
    cur = conn.cursor()

    print('\n1. Making sellerId nullable...')
    print('2. Adding source field...')
    print('3. Adding revolico_id field...')
    print('4. Adding scraped_at field...')
    print('5. Creating index on revolico_id...')
    print('6. Creating index on source...')

    cur.execute(sql)
    conn.commit()

    print('\n✅ Migration completed successfully!')
    print('Added fields:')
    print('  - source (TEXT, default: "user")')
    print('  - revolico_id (TEXT)')
    print('  - scraped_at (TIMESTAMP)')
    print('Modified fields:')
    print('  - seller_id (now nullable)')
    print('Created indexes:')
    print('  - idx_listings_revolico_id')
    print('  - idx_listings_source')

    cur.close()
    conn.close()

except ImportError:
    print('psycopg2 not found, using psql command...')
    import subprocess

    # Extract connection details from DATABASE_URL
    try:
        from urllib.parse import urlparse
        result = urlparse(database_url)

        env = os.environ.copy()
        if result.password:
            env['PGPASSWORD'] = result.password

        cmd = [
            'psql',
            '-h', result.hostname or 'localhost',
            '-p', str(result.port or 5432),
            '-U', result.username or 'postgres',
            '-d', result.path[1:] if result.path else 'cuba_marketplace',
            '-f', 'migrate.sql'
        ]

        subprocess.run(cmd, env=env, check=True)

        print('\n✅ Migration completed successfully!')

    except Exception as e:
        print(f'❌ Migration failed: {e}')
        sys.exit(1)

except Exception as e:
    print(f'❌ Migration failed: {e}')
    sys.exit(1)
