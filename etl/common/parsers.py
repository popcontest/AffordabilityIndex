#!/usr/bin/env python3
"""
Parsing and data cleaning utilities.

Provides:
- FIPS code normalization and validation
- Excel/CSV parsing helpers
- Data type conversion with error handling
- Column mapping and detection
"""

import logging
from typing import Optional, Dict, Any, List
from io import BytesIO

import pandas as pd

logger = logging.getLogger(__name__)


def normalize_county_fips(fips: Any) -> Optional[str]:
    """
    Normalize county FIPS code to 5-digit string.

    Handles:
    - Integer FIPS codes (pad with zeros)
    - String FIPS codes (extract first 5 digits if longer)
    - Invalid/null values (return None)

    Args:
        fips: FIPS code in any format

    Returns:
        5-digit string or None

    Examples:
        normalize_county_fips(1073) -> '01073'
        normalize_county_fips('01073') -> '01073'
        normalize_county_fips('0107399999') -> '01073'  # HUD/FHFA 9-digit format
        normalize_county_fips(None) -> None
    """
    if pd.isna(fips):
        return None

    # Convert to string
    fips_str = str(fips).strip()

    # Remove decimal points (from float conversion)
    if '.' in fips_str:
        fips_str = fips_str.split('.')[0]

    # Extract first 5 digits if longer (handles HUD/FHFA 9-digit codes)
    if len(fips_str) > 5:
        fips_str = fips_str[:5]

    # Pad with zeros if shorter
    fips_str = fips_str.zfill(5)

    # Validate: should be exactly 5 digits
    if len(fips_str) != 5 or not fips_str.isdigit():
        logger.warning(f"Invalid FIPS code after normalization: {fips} -> {fips_str}")
        return None

    return fips_str


def read_excel_with_headers(
    file_path_or_buffer,
    skiprows: int = 0,
    header_row: Optional[int] = None,
    column_names: Optional[List[str]] = None,
    sheet_name: Any = 0,
    **kwargs
) -> pd.DataFrame:
    """
    Read Excel file with intelligent header handling.

    Args:
        file_path_or_buffer: Path or BytesIO buffer
        skiprows: Number of rows to skip before reading
        header_row: Row number to use as header (after skiprows)
        column_names: Manual column names (overrides header_row)
        sheet_name: Sheet to read
        **kwargs: Additional arguments to pd.read_excel

    Returns:
        DataFrame with cleaned data

    Example:
        # FHFA file: Skip 5 disclaimer rows, use row 0 as header
        df = read_excel_with_headers(
            buffer,
            skiprows=5,
            header_row=0
        )

        # HUD file: Skip 0 rows, manually name columns
        df = read_excel_with_headers(
            buffer,
            column_names=['fips', 'fmr_0', 'fmr_1', 'fmr_2']
        )
    """
    if column_names:
        df = pd.read_excel(
            file_path_or_buffer,
            sheet_name=sheet_name,
            skiprows=skiprows,
            header=None,
            names=column_names,
            **kwargs
        )
    elif header_row is not None:
        df = pd.read_excel(
            file_path_or_buffer,
            sheet_name=sheet_name,
            skiprows=skiprows,
            header=header_row,
            **kwargs
        )
    else:
        df = pd.read_excel(
            file_path_or_buffer,
            sheet_name=sheet_name,
            skiprows=skiprows,
            **kwargs
        )

    logger.info(f"Read Excel file: {df.shape[0]:,} rows, {df.shape[1]} columns")

    return df


def detect_column_names(
    df: pd.DataFrame,
    patterns: Dict[str, List[str]]
) -> Dict[str, str]:
    """
    Detect column names using pattern matching.

    Args:
        df: DataFrame to search
        patterns: Dict mapping target name to list of possible column name patterns

    Returns:
        Dict mapping target name to actual column name

    Example:
        column_map = detect_column_names(df, {
            'fips': ['fips', 'fips_code', 'county_fips', 'fips2010'],
            'fmr_1br': ['fmr1', 'fmr_1', 'fmr_1br', '1_bedroom']
        })
        # Returns: {'fips': 'fips2010', 'fmr_1br': 'fmr1'}
    """
    column_map = {}

    for target, possible_names in patterns.items():
        for col in df.columns:
            col_lower = str(col).lower()

            for pattern in possible_names:
                if pattern.lower() in col_lower:
                    column_map[target] = col
                    logger.debug(f"Detected '{target}' column: {col}")
                    break

            if target in column_map:
                break

        if target not in column_map:
            logger.warning(f"Could not detect column for '{target}'")

    return column_map


def safe_numeric_convert(
    series: pd.Series,
    default: Optional[float] = None
) -> pd.Series:
    """
    Safely convert series to numeric, replacing errors with default.

    Args:
        series: Pandas series to convert
        default: Value to use for non-numeric values (None for NaN)

    Returns:
        Numeric series
    """
    converted = pd.to_numeric(series, errors='coerce')

    if default is not None:
        converted = converted.fillna(default)

    return converted


def filter_valid_rows(
    df: pd.DataFrame,
    required_columns: List[str],
    numeric_columns: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    Filter DataFrame to rows with valid data.

    Args:
        df: DataFrame to filter
        required_columns: Columns that must not be null
        numeric_columns: Columns that must have at least one non-null numeric value

    Returns:
        Filtered DataFrame

    Example:
        df_clean = filter_valid_rows(
            df,
            required_columns=['fips'],
            numeric_columns=['fmr_1br', 'fmr_2br', 'fmr_3br']
        )
    """
    initial_rows = len(df)

    # Remove rows with null required columns
    for col in required_columns:
        if col in df.columns:
            df = df[df[col].notna()]

    # Remove rows with all null numeric columns
    if numeric_columns:
        numeric_cols = [col for col in numeric_columns if col in df.columns]
        if numeric_cols:
            df = df[df[numeric_cols].notna().any(axis=1)]

    filtered_rows = initial_rows - len(df)

    if filtered_rows > 0:
        logger.info(f"Filtered out {filtered_rows:,} invalid rows ({filtered_rows/initial_rows*100:.1f}%)")

    return df


def download_file_to_buffer(url: str, timeout: int = 60) -> BytesIO:
    """
    Download file from URL to in-memory buffer.

    Args:
        url: URL to download
        timeout: Request timeout in seconds

    Returns:
        BytesIO buffer containing file content

    Raises:
        Exception: If download fails
    """
    import requests

    logger.info(f"Downloading from {url}")

    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()

        logger.info(f"Downloaded {len(response.content):,} bytes")
        return BytesIO(response.content)

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to download file: {e}")
        raise


def inspect_excel_structure(file_path_or_buffer, sheet_name: Any = 0, max_rows: int = 20):
    """
    Inspect Excel file structure for debugging parsing issues.

    Prints:
    - Sheet names
    - First N rows (raw)
    - Column info

    Args:
        file_path_or_buffer: Path or buffer
        sheet_name: Sheet to inspect
        max_rows: Maximum rows to display
    """
    try:
        xlsx = pd.ExcelFile(file_path_or_buffer, engine='openpyxl')
        print(f"\n{'='*70}")
        print("EXCEL FILE STRUCTURE")
        print(f"{'='*70}")
        print(f"\nSheets: {xlsx.sheet_names}")

        df = pd.read_excel(file_path_or_buffer, sheet_name=sheet_name, header=None, engine='openpyxl')

        print(f"\nShape: {df.shape}")
        print(f"\nFirst {min(max_rows, len(df))} rows (raw):")
        print(df.head(max_rows))

        print(f"\nColumn types:")
        print(df.dtypes)

        print(f"{'='*70}\n")

    except Exception as e:
        logger.error(f"Failed to inspect Excel file: {e}")
