"""
Fix geoType column in v2_affordability_score table from VARCHAR to enum
"""
import os
import psycopg2

DATABASE_URL = os.getenv('DATABASE_URL')

def fix_geotype_enum():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Check if GeoType enum exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM pg_type
                WHERE typname = 'GeoType'
            );
        """)
        enum_exists = cursor.fetchone()[0]

        if not enum_exists:
            print("Creating GeoType enum...")
            cursor.execute("""
                CREATE TYPE "GeoType" AS ENUM ('PLACE', 'CITY', 'ZCTA');
            """)
            conn.commit()
            print("[OK] GeoType enum created")
        else:
            print("[OK] GeoType enum already exists")

        # Now alter the column to use the enum type
        print("Converting geoType column from VARCHAR to GeoType enum...")

        # PostgreSQL requires converting via TEXT first
        cursor.execute("""
            ALTER TABLE v2_affordability_score
            ALTER COLUMN "geoType" TYPE "GeoType"
            USING "geoType"::text::"GeoType";
        """)
        conn.commit()
        print("[OK] Column successfully converted to GeoType enum")

        # Verify the change
        cursor.execute("""
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns
            WHERE table_name = 'v2_affordability_score'
            AND column_name = 'geoType';
        """)
        result = cursor.fetchone()
        print(f"[OK] Verification: column '{result[0]}' has type '{result[1]}' (udt: {result[2]})")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    fix_geotype_enum()
