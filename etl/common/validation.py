#!/usr/bin/env python3
"""
Data validation framework for ETL quality checks.

Provides:
- Pre-import validation rules
- Post-import quality checks
- Coverage statistics
- Data quality scoring
"""

import logging
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from enum import Enum

import pandas as pd

logger = logging.getLogger(__name__)


class Severity(Enum):
    """Validation issue severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ValidationResult:
    """Result of a validation check."""
    check_name: str
    passed: bool
    severity: Severity
    message: str
    details: Optional[Dict[str, Any]] = None


class ValidationError(Exception):
    """Exception raised when critical validation fails."""
    pass


class DataValidator:
    """
    Validates data quality for ETL operations.

    Usage:
        validator = DataValidator()
        validator.add_check('no_nulls', check_no_nulls, Severity.ERROR, columns=['fips'])
        results = validator.validate(df)

        if validator.has_errors(results):
            raise ValidationError("Validation failed")
    """

    def __init__(self):
        self.checks: List[tuple] = []

    def add_check(
        self,
        name: str,
        check_func: Callable,
        severity: Severity,
        **kwargs
    ):
        """
        Add a validation check.

        Args:
            name: Check name
            check_func: Function that returns (passed: bool, message: str, details: dict)
            severity: Issue severity
            **kwargs: Arguments to pass to check_func
        """
        self.checks.append((name, check_func, severity, kwargs))

    def validate(self, data: Any) -> List[ValidationResult]:
        """
        Run all validation checks.

        Args:
            data: Data to validate (DataFrame, dict, etc.)

        Returns:
            List of validation results
        """
        results = []

        for name, check_func, severity, kwargs in self.checks:
            try:
                passed, message, details = check_func(data, **kwargs)
                results.append(ValidationResult(name, passed, severity, message, details))

                if passed:
                    logger.debug(f"✓ {name}: {message}")
                else:
                    log_func = {
                        Severity.INFO: logger.info,
                        Severity.WARNING: logger.warning,
                        Severity.ERROR: logger.error,
                        Severity.CRITICAL: logger.critical
                    }[severity]
                    log_func(f"✗ {name}: {message}")

            except Exception as e:
                logger.error(f"Validation check '{name}' failed with exception: {e}")
                results.append(ValidationResult(
                    name,
                    False,
                    Severity.ERROR,
                    f"Check failed: {e}",
                    None
                ))

        return results

    def has_errors(self, results: List[ValidationResult]) -> bool:
        """Check if any validation failed with ERROR or CRITICAL severity."""
        return any(
            not r.passed and r.severity in [Severity.ERROR, Severity.CRITICAL]
            for r in results
        )

    def print_summary(self, results: List[ValidationResult]):
        """Print validation summary."""
        passed = sum(1 for r in results if r.passed)
        total = len(results)

        print(f"\n{'='*70}")
        print(f"VALIDATION SUMMARY: {passed}/{total} checks passed")
        print(f"{'='*70}")

        for result in results:
            status = "✓" if result.passed else "✗"
            print(f"{status} [{result.severity.value.upper()}] {result.check_name}: {result.message}")

        print(f"{'='*70}\n")


# Common validation check functions

def check_no_nulls(df: pd.DataFrame, columns: List[str]) -> tuple:
    """Check that specified columns have no null values."""
    null_counts = {}
    has_nulls = False

    for col in columns:
        if col in df.columns:
            null_count = df[col].isna().sum()
            if null_count > 0:
                null_counts[col] = null_count
                has_nulls = True

    if has_nulls:
        return (
            False,
            f"Found null values: {null_counts}",
            {'null_counts': null_counts}
        )
    else:
        return (
            True,
            f"No nulls in required columns: {columns}",
            None
        )


def check_min_rows(df: pd.DataFrame, min_rows: int) -> tuple:
    """Check that DataFrame has minimum number of rows."""
    row_count = len(df)

    if row_count < min_rows:
        return (
            False,
            f"Insufficient rows: {row_count:,} < {min_rows:,}",
            {'row_count': row_count, 'min_rows': min_rows}
        )
    else:
        return (
            True,
            f"Sufficient rows: {row_count:,} >= {min_rows:,}",
            {'row_count': row_count}
        )


def check_value_range(
    df: pd.DataFrame,
    column: str,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None
) -> tuple:
    """Check that numeric column values are within expected range."""
    if column not in df.columns:
        return (False, f"Column '{column}' not found", None)

    series = pd.to_numeric(df[column], errors='coerce')
    valid_values = series.dropna()

    if len(valid_values) == 0:
        return (False, f"No valid numeric values in '{column}'", None)

    actual_min = valid_values.min()
    actual_max = valid_values.max()

    out_of_range = 0

    if min_value is not None and actual_min < min_value:
        out_of_range += (valid_values < min_value).sum()

    if max_value is not None and actual_max > max_value:
        out_of_range += (valid_values > max_value).sum()

    if out_of_range > 0:
        return (
            False,
            f"Column '{column}' has {out_of_range:,} values out of range [{min_value}, {max_value}]",
            {'actual_min': actual_min, 'actual_max': actual_max, 'out_of_range': out_of_range}
        )
    else:
        return (
            True,
            f"Column '{column}' values in range: [{actual_min:.2f}, {actual_max:.2f}]",
            {'actual_min': actual_min, 'actual_max': actual_max}
        )


def check_fips_format(df: pd.DataFrame, column: str) -> tuple:
    """Check that FIPS codes are valid 5-digit strings."""
    if column not in df.columns:
        return (False, f"Column '{column}' not found", None)

    fips_series = df[column].astype(str)
    valid = fips_series.str.match(r'^\d{5}$', na=False)
    valid_count = valid.sum()
    total_count = len(df)
    invalid_count = total_count - valid_count

    if invalid_count > 0:
        return (
            False,
            f"Column '{column}' has {invalid_count:,} invalid FIPS codes",
            {'valid': valid_count, 'invalid': invalid_count}
        )
    else:
        return (
            True,
            f"All {total_count:,} FIPS codes are valid",
            {'valid': valid_count}
        )


def check_coverage(
    actual_count: int,
    expected_count: int,
    min_coverage_pct: float = 75.0
) -> tuple:
    """Check that data coverage meets minimum threshold."""
    coverage_pct = (actual_count / expected_count * 100) if expected_count > 0 else 0

    if coverage_pct < min_coverage_pct:
        return (
            False,
            f"Coverage {coverage_pct:.1f}% < {min_coverage_pct:.1f}%",
            {'actual': actual_count, 'expected': expected_count, 'coverage': coverage_pct}
        )
    else:
        return (
            True,
            f"Coverage {coverage_pct:.1f}% >= {min_coverage_pct:.1f}%",
            {'actual': actual_count, 'expected': expected_count, 'coverage': coverage_pct}
        )


def check_duplicates(df: pd.DataFrame, columns: List[str]) -> tuple:
    """Check for duplicate rows based on specified columns."""
    if not all(col in df.columns for col in columns):
        return (False, f"Not all columns found: {columns}", None)

    duplicates = df.duplicated(subset=columns, keep=False)
    dup_count = duplicates.sum()

    if dup_count > 0:
        return (
            False,
            f"Found {dup_count:,} duplicate rows on columns {columns}",
            {'duplicate_count': dup_count}
        )
    else:
        return (
            True,
            f"No duplicates found on columns {columns}",
            None
        )


def calculate_quality_score(
    df: pd.DataFrame,
    required_columns: List[str],
    optional_columns: List[str]
) -> float:
    """
    Calculate data quality score (0-100).

    Factors:
    - Required column completeness (50%)
    - Optional column completeness (30%)
    - Data validity (20%)

    Args:
        df: DataFrame to score
        required_columns: Columns that should not be null
        optional_columns: Columns that add value when present

    Returns:
        Quality score (0-100)
    """
    if len(df) == 0:
        return 0.0

    # Required column completeness (50 points)
    required_score = 0.0
    for col in required_columns:
        if col in df.columns:
            completeness = df[col].notna().sum() / len(df)
            required_score += completeness * (50.0 / len(required_columns))

    # Optional column completeness (30 points)
    optional_score = 0.0
    for col in optional_columns:
        if col in df.columns:
            completeness = df[col].notna().sum() / len(df)
            optional_score += completeness * (30.0 / len(optional_columns))

    # Data validity (20 points) - no duplicates, reasonable value ranges
    validity_score = 20.0

    # Deduct for duplicates
    if 'fips' in df.columns:
        dup_rate = df.duplicated(subset=['fips']).sum() / len(df)
        validity_score -= dup_rate * 10.0

    # Deduct for extreme outliers (values more than 5 std dev from mean)
    for col in df.select_dtypes(include=['number']).columns:
        if df[col].notna().sum() > 0:
            mean = df[col].mean()
            std = df[col].std()
            if std > 0:
                outliers = ((df[col] - mean).abs() > 5 * std).sum()
                outlier_rate = outliers / len(df)
                validity_score -= outlier_rate * 2.0

    total_score = required_score + optional_score + max(0, validity_score)

    return min(100.0, max(0.0, total_score))
