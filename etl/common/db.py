#!/usr/bin/env python3
"""
Database connection and transaction utilities.

Provides:
- Connection management with automatic cleanup
- Transaction context managers
- Bulk operations with batching
- Common query patterns
"""

import os
import logging
from contextlib import contextmanager
from typing import List, Tuple, Optional, Any

import psycopg2
from psycopg2.extras import execute_values

logger = logging.getLogger(__name__)


class DatabaseError(Exception):
    """Base exception for database operations."""
    pass


def get_connection(database_url: Optional[str] = None) -> psycopg2.extensions.connection:
    """
    Get a database connection.

    Args:
        database_url: Database URL (defaults to DATABASE_URL env var)

    Returns:
        psycopg2 connection object

    Raises:
        DatabaseError: If connection fails
    """
    url = database_url or os.getenv('DATABASE_URL')

    if not url:
        raise DatabaseError("DATABASE_URL not set in environment")

    try:
        conn = psycopg2.connect(url)
        return conn
    except psycopg2.Error as e:
        raise DatabaseError(f"Failed to connect to database: {e}")


@contextmanager
def transaction(conn: Optional[psycopg2.extensions.connection] = None,
                database_url: Optional[str] = None):
    """
    Context manager for database transactions with automatic rollback on error.

    Usage:
        with transaction() as (conn, cursor):
            cursor.execute("INSERT ...")
            # Automatically commits on success, rolls back on exception

    Args:
        conn: Existing connection (optional, creates new if not provided)
        database_url: Database URL (optional)

    Yields:
        tuple: (connection, cursor)
    """
    created_conn = False

    if conn is None:
        conn = get_connection(database_url)
        created_conn = True

    cursor = conn.cursor()

    try:
        yield conn, cursor
        conn.commit()
        logger.debug("Transaction committed")
    except Exception as e:
        conn.rollback()
        logger.error(f"Transaction rolled back due to error: {e}")
        raise
    finally:
        cursor.close()
        if created_conn:
            conn.close()


def bulk_upsert(
    cursor: psycopg2.extensions.cursor,
    table: str,
    columns: List[str],
    values: List[Tuple],
    conflict_columns: List[str],
    update_columns: Optional[List[str]] = None,
    page_size: int = 1000
) -> int:
    """
    Perform bulk upsert (INSERT ... ON CONFLICT UPDATE).

    Args:
        cursor: Database cursor
        table: Table name
        columns: Column names
        values: List of tuples with values
        conflict_columns: Columns to check for conflicts
        update_columns: Columns to update on conflict (defaults to all non-conflict columns)
        page_size: Batch size for execute_values

    Returns:
        Number of rows affected

    Example:
        bulk_upsert(
            cursor,
            table='affordability_snapshot',
            columns=['geoId', 'geoType', 'hudFmr2Br'],
            values=[('city123', 'CITY', 1500.0)],
            conflict_columns=['geoId', 'geoType'],
            update_columns=['hudFmr2Br']
        )
    """
    if not values:
        logger.warning("No values provided for bulk upsert")
        return 0

    if update_columns is None:
        update_columns = [col for col in columns if col not in conflict_columns]

    # Build quoted column names for Prisma camelCase
    quoted_columns = [f'"{col}"' if col[0].islower() and any(c.isupper() for c in col) else col
                      for col in columns]

    columns_str = ', '.join(quoted_columns)
    conflict_str = ', '.join(f'"{col}"' if col[0].islower() and any(c.isupper() for c in col) else col
                              for col in conflict_columns)

    # Build UPDATE clause
    update_parts = []
    for col in update_columns:
        quoted = f'"{col}"' if col[0].islower() and any(c.isupper() for c in col) else col
        update_parts.append(f'{quoted} = EXCLUDED.{quoted}')
    update_str = ', '.join(update_parts)

    query = f"""
        INSERT INTO {table} ({columns_str})
        VALUES %s
        ON CONFLICT ({conflict_str})
        DO UPDATE SET {update_str}
    """

    execute_values(cursor, query, values, page_size=page_size)
    rows_affected = cursor.rowcount

    logger.info(f"Bulk upsert affected {rows_affected:,} rows in {table}")
    return rows_affected


def bulk_update(
    cursor: psycopg2.extensions.cursor,
    table: str,
    update_columns: List[str],
    values: List[Tuple],
    where_column: str,
    page_size: int = 1000
) -> int:
    """
    Perform bulk update using VALUES join pattern.

    Args:
        cursor: Database cursor
        table: Table name
        update_columns: Columns to update
        values: List of tuples (update_values..., where_value)
        where_column: Column to use in WHERE clause (last value in tuple)
        page_size: Batch size

    Returns:
        Number of rows affected

    Example:
        bulk_update(
            cursor,
            table='affordability_snapshot',
            update_columns=['hudFmr2Br'],
            values=[(1500.0, 'city123')],
            where_column='geoId'
        )
    """
    if not values:
        logger.warning("No values provided for bulk update")
        return 0

    # Build quoted column names
    quoted_updates = [f'"{col}"' if col[0].islower() and any(c.isupper() for c in col) else col
                      for col in update_columns]
    quoted_where = f'"{where_column}"' if where_column[0].islower() and any(c.isupper() for c in where_column) else where_column

    # Build SET clause
    set_parts = []
    value_columns = update_columns + [where_column]
    for i, col in enumerate(quoted_updates):
        set_parts.append(f'{col} = v.col{i}')
    set_str = ', '.join(set_parts)

    # Build VALUES column list
    value_cols_str = ', '.join(f'col{i}' for i in range(len(value_columns)))

    query = f"""
        UPDATE {table} AS t
        SET {set_str}
        FROM (VALUES %s) AS v({value_cols_str})
        WHERE t.{quoted_where} = v.col{len(update_columns)}
    """

    execute_values(cursor, query, values, page_size=page_size)
    rows_affected = cursor.rowcount

    logger.info(f"Bulk update affected {rows_affected:,} rows in {table}")
    return rows_affected


def ensure_snapshots_exist(
    cursor: psycopg2.extensions.cursor,
    geo_type: str,
    geo_ids: List[str],
    as_of_date: str = 'CURRENT_DATE'
) -> int:
    """
    Ensure affordability_snapshot records exist for given geo IDs.

    Args:
        cursor: Database cursor
        geo_type: 'CITY', 'ZCTA', or 'PLACE'
        geo_ids: List of geographic IDs
        as_of_date: Date for snapshot (SQL expression, defaults to CURRENT_DATE)

    Returns:
        Number of snapshots created

    Example:
        ensure_snapshots_exist(cursor, 'CITY', ['city123', 'city456'])
    """
    if not geo_ids:
        return 0

    values = [(gid, geo_type, as_of_date) for gid in geo_ids]

    query = f"""
        INSERT INTO affordability_snapshot
            (id, "geoId", "geoType", "asOfDate")
        SELECT
            gen_random_uuid(),
            v.geo_id,
            v.geo_type,
            {as_of_date}
        FROM (VALUES %s) AS v(geo_id, geo_type, as_of_date)
        ON CONFLICT ("geoId", "geoType") DO NOTHING
    """

    execute_values(cursor, query, values, template='(%s, %s, NULL)')
    created = cursor.rowcount

    if created > 0:
        logger.info(f"Created {created:,} missing affordability_snapshot records")

    return created


def get_cities_with_county_fips(cursor: psycopg2.extensions.cursor) -> List[Tuple[str, str, str, str]]:
    """
    Get all cities that have county FIPS codes.

    Args:
        cursor: Database cursor

    Returns:
        List of tuples: (cityId, name, stateAbbr, countyFips)
    """
    cursor.execute("""
        SELECT "cityId", name, "stateAbbr", "countyFips"
        FROM geo_city
        WHERE "countyFips" IS NOT NULL
        ORDER BY "cityId"
    """)

    return cursor.fetchall()


def get_cities_without_county_fips(cursor: psycopg2.extensions.cursor,
                                     limit: Optional[int] = None) -> List[Tuple[str, str, str]]:
    """
    Get cities missing county FIPS codes (for backfilling).

    Args:
        cursor: Database cursor
        limit: Maximum number to return (optional)

    Returns:
        List of tuples: (cityId, name, stateAbbr)
    """
    limit_clause = f"LIMIT {limit}" if limit else ""

    cursor.execute(f"""
        SELECT "cityId", name, "stateAbbr"
        FROM geo_city
        WHERE "countyFips" IS NULL
        ORDER BY population DESC NULLS LAST
        {limit_clause}
    """)

    return cursor.fetchall()


def get_all_cities(cursor: psycopg2.extensions.cursor) -> List[Tuple[str, str, str]]:
    """
    Get all cities from geo_city table.

    Args:
        cursor: Database cursor

    Returns:
        List of tuples: (cityId, name, stateAbbr)
    """
    cursor.execute("""
        SELECT "cityId", name, "stateAbbr"
        FROM geo_city
        ORDER BY "cityId"
    """)

    return cursor.fetchall()


def update_snapshot_fields(
    cursor: psycopg2.extensions.cursor,
    field_updates: dict,
    city_id: str,
    dry_run: bool = False
) -> int:
    """
    Update multiple fields in affordability_snapshot for a city.

    Args:
        cursor: Database cursor
        field_updates: Dict of {field_name: value}
        city_id: City ID to update
        dry_run: If True, skip actual update

    Returns:
        Number of rows updated (0 if dry_run)

    Example:
        update_snapshot_fields(
            cursor,
            {'hudFmr2Br': 1500.0, 'hudFmr3Br': 1800.0},
            'city123'
        )
    """
    if dry_run or not field_updates:
        return 0

    # Build SET clause with proper quoting
    set_parts = []
    values = []
    for field, value in field_updates.items():
        quoted = f'"{field}"' if field[0].islower() and any(c.isupper() for c in field) else field
        set_parts.append(f'{quoted} = %s')
        values.append(value)

    set_clause = ', '.join(set_parts)
    values.append(city_id)

    query = f"""
        UPDATE affordability_snapshot
        SET {set_clause}
        WHERE "geoType" = 'CITY' AND "geoId" = %s
    """

    cursor.execute(query, values)
    return cursor.rowcount
