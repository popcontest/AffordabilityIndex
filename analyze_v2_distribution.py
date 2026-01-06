"""
Comprehensive analysis of V2 affordability score distribution.
Determines if re-normalization is needed.
"""

import os
import psycopg2
import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, Tuple
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def connect_db():
    """Connect to PostgreSQL database."""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL environment variable not set")
    return psycopg2.connect(database_url)

def get_basic_statistics(conn) -> Dict:
    """Get basic distribution statistics for all scores."""

    query = """
    SELECT
        -- Composite score stats
        COUNT(*) as total_records,
        COUNT("compositeScore") as composite_count,
        MIN("compositeScore") as composite_min,
        MAX("compositeScore") as composite_max,
        AVG("compositeScore") as composite_mean,
        STDDEV("compositeScore") as composite_stddev,
        PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY "compositeScore") as composite_p10,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY "compositeScore") as composite_p25,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY "compositeScore") as composite_p50,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY "compositeScore") as composite_p75,
        PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY "compositeScore") as composite_p90,

        -- Housing score stats
        COUNT("housingScore") as housing_count,
        MIN("housingScore") as housing_min,
        MAX("housingScore") as housing_max,
        AVG("housingScore") as housing_mean,
        STDDEV("housingScore") as housing_stddev,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY "housingScore") as housing_median,

        -- COL score stats
        COUNT("colScore") as col_count,
        MIN("colScore") as col_min,
        MAX("colScore") as col_max,
        AVG("colScore") as col_mean,
        STDDEV("colScore") as col_stddev,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY "colScore") as col_median,

        -- Tax score stats
        COUNT("taxScore") as tax_count,
        MIN("taxScore") as tax_min,
        MAX("taxScore") as tax_max,
        AVG("taxScore") as tax_mean,
        STDDEV("taxScore") as tax_stddev,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY "taxScore") as tax_median

    FROM v2_affordability_score
    WHERE "compositeScore" IS NOT NULL
    """

    df = pd.read_sql_query(query, conn)
    return df.iloc[0].to_dict()

def get_quartile_distribution(conn) -> Dict:
    """Get count of records in each quartile."""

    query = """
    WITH stats AS (
        SELECT
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY "compositeScore") as q1,
            PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY "compositeScore") as q2,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY "compositeScore") as q3
        FROM v2_affordability_score
        WHERE "compositeScore" IS NOT NULL
    )
    SELECT
        COUNT(CASE WHEN "compositeScore" <= s.q1 THEN 1 END) as quartile_1,
        COUNT(CASE WHEN "compositeScore" > s.q1 AND "compositeScore" <= s.q2 THEN 1 END) as quartile_2,
        COUNT(CASE WHEN "compositeScore" > s.q2 AND "compositeScore" <= s.q3 THEN 1 END) as quartile_3,
        COUNT(CASE WHEN "compositeScore" > s.q3 THEN 1 END) as quartile_4
    FROM v2_affordability_score, stats s
    WHERE "compositeScore" IS NOT NULL
    """

    df = pd.read_sql_query(query, conn)
    return df.iloc[0].to_dict()

def get_raw_scores(conn) -> pd.DataFrame:
    """Get all scores for detailed analysis."""

    query = """
    SELECT
        "geoType" as geo_type,
        "geoId" as geo_id,
        "compositeScore" as composite_score,
        "housingScore" as housing_score,
        "colScore" as col_score,
        "taxScore" as tax_score,
        "housingBurdenRatio" as housing_burden_ratio,
        "colBurdenRatio" as col_burden_ratio,
        "taxBurdenRatio" as tax_burden_ratio,
        "dataQuality" as data_quality
    FROM v2_affordability_score
    WHERE "compositeScore" IS NOT NULL
    ORDER BY "compositeScore" DESC
    """

    return pd.read_sql_query(query, conn)

def calculate_normality_tests(scores: pd.Series) -> Dict:
    """Calculate skewness, kurtosis, and normality tests."""

    # Remove NaN values
    clean_scores = scores.dropna()

    if len(clean_scores) < 3:
        return {
            'skewness': None,
            'kurtosis': None,
            'shapiro_p_value': None,
            'error': 'Insufficient data'
        }

    skewness = stats.skew(clean_scores)
    kurtosis = stats.kurtosis(clean_scores)  # Excess kurtosis (normal = 0)

    # Shapiro-Wilk test for normality (only works for n < 5000)
    if len(clean_scores) < 5000:
        shapiro_stat, shapiro_p = stats.shapiro(clean_scores)
    else:
        # Use sample for large datasets
        sample = clean_scores.sample(n=5000, random_state=42)
        shapiro_stat, shapiro_p = stats.shapiro(sample)

    return {
        'skewness': skewness,
        'kurtosis': kurtosis,
        'shapiro_statistic': shapiro_stat,
        'shapiro_p_value': shapiro_p
    }

def check_standard_deviation_coverage(df: pd.DataFrame, score_col: str = 'composite_score') -> Dict:
    """Check if distribution follows normal distribution pattern."""

    scores = df[score_col].dropna()
    mean = scores.mean()
    std = scores.std()

    # Count values within 1, 2, and 3 standard deviations
    within_1std = ((scores >= mean - std) & (scores <= mean + std)).sum()
    within_2std = ((scores >= mean - 2*std) & (scores <= mean + 2*std)).sum()
    within_3std = ((scores >= mean - 3*std) & (scores <= mean + 3*std)).sum()

    total = len(scores)

    return {
        'within_1std_pct': (within_1std / total) * 100,
        'within_2std_pct': (within_2std / total) * 100,
        'within_3std_pct': (within_3std / total) * 100,
        'expected_1std': 68.27,
        'expected_2std': 95.45,
        'expected_3std': 99.73
    }

def identify_outliers(df: pd.DataFrame, score_col: str = 'composite_score') -> Dict:
    """Identify outliers using IQR method."""

    scores = df[score_col].dropna()
    q1 = scores.quantile(0.25)
    q3 = scores.quantile(0.75)
    iqr = q3 - q1

    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr

    outliers = df[(df[score_col] < lower_bound) | (df[score_col] > upper_bound)]

    return {
        'iqr': iqr,
        'lower_bound': lower_bound,
        'upper_bound': upper_bound,
        'outlier_count': len(outliers),
        'outlier_pct': (len(outliers) / len(scores)) * 100,
        'outlier_samples': outliers.head(10)[['geo_type', 'geo_id', score_col]].to_dict('records')
    }

def compare_component_distributions(df: pd.DataFrame) -> Dict:
    """Compare distribution characteristics of each component."""

    components = {
        'composite': 'composite_score',
        'housing': 'housing_score',
        'col': 'col_score',
        'tax': 'tax_score'
    }

    results = {}

    for name, col in components.items():
        if col in df.columns:
            scores = df[col].dropna()

            if len(scores) > 0:
                results[name] = {
                    'mean': scores.mean(),
                    'median': scores.median(),
                    'std': scores.std(),
                    'min': scores.min(),
                    'max': scores.max(),
                    'skewness': stats.skew(scores),
                    'kurtosis': stats.kurtosis(scores),
                    'count': len(scores)
                }

    return results

def analyze_score_ranges(df: pd.DataFrame) -> Dict:
    """Analyze distribution across score ranges."""

    ranges = [
        (0, 20, '0-20 (Very Low Affordability)'),
        (20, 40, '20-40 (Low Affordability)'),
        (40, 60, '40-60 (Moderate Affordability)'),
        (60, 80, '60-80 (Good Affordability)'),
        (80, 100, '80-100 (Excellent Affordability)')
    ]

    results = {}
    total = len(df[df['composite_score'].notna()])

    for min_val, max_val, label in ranges:
        count = len(df[(df['composite_score'] >= min_val) & (df['composite_score'] < max_val)])
        results[label] = {
            'count': count,
            'percentage': (count / total) * 100 if total > 0 else 0
        }

    return results

def generate_recommendation(
    basic_stats: Dict,
    normality: Dict,
    std_coverage: Dict,
    outliers: Dict,
    component_comparison: Dict,
    range_analysis: Dict
) -> Dict:
    """Generate recommendation on whether re-normalization is needed."""

    issues = []
    recommendations = []

    # Check 1: Are scores using the full 0-100 range?
    if basic_stats['composite_min'] > 10:
        issues.append(f"Minimum score is {basic_stats['composite_min']:.2f}, not utilizing low end of scale")
        recommendations.append("Consider min-max normalization to spread scores across full 0-100 range")

    if basic_stats['composite_max'] < 90:
        issues.append(f"Maximum score is {basic_stats['composite_max']:.2f}, not utilizing high end of scale")
        recommendations.append("Consider min-max normalization to spread scores across full 0-100 range")

    # Check 2: Is distribution heavily skewed?
    skew = normality['skewness']
    if skew and abs(skew) > 1.0:
        skew_direction = "right" if skew > 0 else "left"
        issues.append(f"Distribution is heavily skewed {skew_direction} (skewness: {skew:.3f})")
        if abs(skew) > 2.0:
            recommendations.append("Consider log or power transformation to reduce skewness")

    # Check 3: Is kurtosis extreme?
    kurt = normality['kurtosis']
    if kurt and abs(kurt) > 3.0:
        issues.append(f"Distribution has extreme kurtosis: {kurt:.3f} (heavy tails or peaked)")
        recommendations.append("Investigate outliers or consider robust scaling methods")

    # Check 4: Check std deviation coverage
    if std_coverage['within_1std_pct'] < 60 or std_coverage['within_1std_pct'] > 75:
        issues.append(f"Only {std_coverage['within_1std_pct']:.1f}% within 1 std dev (expected ~68%)")

    # Check 5: Check outliers
    if outliers['outlier_pct'] > 10:
        issues.append(f"High outlier percentage: {outliers['outlier_pct']:.1f}%")
        recommendations.append("Review outlier cities/ZCTAs for data quality issues")

    # Check 6: Component alignment
    composite_range = basic_stats['composite_max'] - basic_stats['composite_min']
    housing_range = component_comparison.get('housing', {}).get('max', 0) - component_comparison.get('housing', {}).get('min', 0)

    if housing_range > 0 and abs(composite_range - housing_range) > 20:
        issues.append("Composite score range differs significantly from component ranges")

    # Check 7: Score concentration
    middle_pct = range_analysis.get('60-80 (Moderate Affordability)', {}).get('percentage', 0)
    if middle_pct > 50:
        issues.append(f"{middle_pct:.1f}% of scores concentrated in middle range (40-60)")
        recommendations.append("Distribution may need to be spread out for better differentiation")

    # Overall recommendation
    needs_normalization = len(issues) >= 3

    recommendation = {
        'needs_renormalization': needs_normalization,
        'severity': 'high' if len(issues) >= 4 else 'moderate' if len(issues) >= 2 else 'low',
        'issues_found': issues,
        'recommendations': recommendations if recommendations else ["Current distribution appears acceptable"],
        'suggested_approach': None
    }

    if needs_normalization:
        if abs(skew) > 1.5:
            recommendation['suggested_approach'] = "Quantile/Rank-based normalization to create uniform distribution"
        elif basic_stats['composite_min'] > 10 or basic_stats['composite_max'] < 90:
            recommendation['suggested_approach'] = "Min-max normalization to utilize full 0-100 scale"
        else:
            recommendation['suggested_approach'] = "Z-score normalization then rescale to 0-100"
    else:
        recommendation['suggested_approach'] = "No normalization needed - current distribution is acceptable"

    return recommendation

def main():
    """Run comprehensive distribution analysis."""

    print("=" * 80)
    print("V2 AFFORDABILITY SCORE DISTRIBUTION ANALYSIS")
    print("=" * 80)
    print()

    conn = connect_db()

    try:
        # 1. Get basic statistics
        print("1. BASIC STATISTICS")
        print("-" * 80)
        basic_stats = get_basic_statistics(conn)

        print(f"Total Records: {basic_stats['total_records']:,}")
        print(f"Records with Composite Score: {basic_stats['composite_count']:,}")
        print()

        print("COMPOSITE SCORE:")
        print(f"  Min:    {basic_stats['composite_min']:.2f}")
        print(f"  Max:    {basic_stats['composite_max']:.2f}")
        print(f"  Mean:   {basic_stats['composite_mean']:.2f}")
        print(f"  Median: {basic_stats['composite_p50']:.2f}")
        print(f"  StdDev: {basic_stats['composite_stddev']:.2f}")
        print()

        print("PERCENTILES:")
        print(f"  10th: {basic_stats['composite_p10']:.2f}")
        print(f"  25th: {basic_stats['composite_p25']:.2f}")
        print(f"  50th: {basic_stats['composite_p50']:.2f}")
        print(f"  75th: {basic_stats['composite_p75']:.2f}")
        print(f"  90th: {basic_stats['composite_p90']:.2f}")
        print()

        # 2. Quartile distribution
        print("2. QUARTILE DISTRIBUTION")
        print("-" * 80)
        quartiles = get_quartile_distribution(conn)
        total = sum(quartiles.values())

        for i in range(1, 5):
            count = quartiles[f'quartile_{i}']
            pct = (count / total) * 100
            print(f"  Q{i}: {count:5,} records ({pct:5.2f}%)")
        print()

        # 3. Get raw data for detailed analysis
        print("3. LOADING RAW DATA FOR DETAILED ANALYSIS...")
        print("-" * 80)
        df = get_raw_scores(conn)
        print(f"Loaded {len(df):,} records")
        print()

        # 4. Normality tests
        print("4. NORMALITY TESTS (Composite Score)")
        print("-" * 80)
        normality = calculate_normality_tests(df['composite_score'])

        print(f"  Skewness:  {normality['skewness']:.4f}")
        print(f"    (0 = symmetric, >0 = right-skewed, <0 = left-skewed)")
        print(f"    Interpretation: ", end="")
        if abs(normality['skewness']) < 0.5:
            print("Fairly symmetric")
        elif abs(normality['skewness']) < 1:
            print("Moderately skewed")
        else:
            print("Highly skewed")
        print()

        print(f"  Kurtosis:  {normality['kurtosis']:.4f}")
        print(f"    (0 = normal, >0 = heavy-tailed/peaked, <0 = light-tailed/flat)")
        print(f"    Interpretation: ", end="")
        if abs(normality['kurtosis']) < 0.5:
            print("Similar to normal distribution")
        elif abs(normality['kurtosis']) < 1:
            print("Moderate deviation from normal")
        else:
            print("Significantly different from normal")
        print()

        print(f"  Shapiro-Wilk p-value: {normality['shapiro_p_value']:.6f}")
        print(f"    (p < 0.05 suggests non-normal distribution)")
        print()

        # 5. Standard deviation coverage
        print("5. STANDARD DEVIATION COVERAGE")
        print("-" * 80)
        std_coverage = check_standard_deviation_coverage(df)

        print(f"  Within 1 std dev: {std_coverage['within_1std_pct']:.2f}% (expected: {std_coverage['expected_1std']:.2f}%)")
        print(f"  Within 2 std dev: {std_coverage['within_2std_pct']:.2f}% (expected: {std_coverage['expected_2std']:.2f}%)")
        print(f"  Within 3 std dev: {std_coverage['within_3std_pct']:.2f}% (expected: {std_coverage['expected_3std']:.2f}%)")
        print()

        # 6. Outlier analysis
        print("6. OUTLIER ANALYSIS (IQR Method)")
        print("-" * 80)
        outliers = identify_outliers(df)

        print(f"  IQR: {outliers['iqr']:.2f}")
        print(f"  Lower Bound: {outliers['lower_bound']:.2f}")
        print(f"  Upper Bound: {outliers['upper_bound']:.2f}")
        print(f"  Outliers: {outliers['outlier_count']} ({outliers['outlier_pct']:.2f}%)")
        print()

        if outliers['outlier_samples']:
            print("  Sample outliers:")
            for sample in outliers['outlier_samples'][:5]:
                print(f"    {sample['geo_type']:5s} {sample['geo_id']:16s} Score: {sample['composite_score']:.2f}")
        print()

        # 7. Component comparison
        print("7. COMPONENT SCORE COMPARISON")
        print("-" * 80)
        component_comparison = compare_component_distributions(df)

        print(f"{'Component':<12} {'Mean':>8} {'Median':>8} {'StdDev':>8} {'Min':>8} {'Max':>8} {'Skew':>8}")
        print("-" * 80)
        for comp_name, comp_stats in component_comparison.items():
            print(f"{comp_name:<12} "
                  f"{comp_stats['mean']:8.2f} "
                  f"{comp_stats['median']:8.2f} "
                  f"{comp_stats['std']:8.2f} "
                  f"{comp_stats['min']:8.2f} "
                  f"{comp_stats['max']:8.2f} "
                  f"{comp_stats['skewness']:8.3f}")
        print()

        # 8. Score range analysis
        print("8. SCORE RANGE DISTRIBUTION")
        print("-" * 80)
        range_analysis = analyze_score_ranges(df)

        for range_label, range_data in range_analysis.items():
            print(f"  {range_label:35s}: {range_data['count']:5,} ({range_data['percentage']:5.2f}%)")
        print()

        # 9. Generate recommendation
        print("=" * 80)
        print("RECOMMENDATION")
        print("=" * 80)

        recommendation = generate_recommendation(
            basic_stats,
            normality,
            std_coverage,
            outliers,
            component_comparison,
            range_analysis
        )

        print(f"NEEDS RE-NORMALIZATION: {recommendation['needs_renormalization']}")
        print(f"SEVERITY: {recommendation['severity'].upper()}")
        print()

        if recommendation['issues_found']:
            print("ISSUES IDENTIFIED:")
            for i, issue in enumerate(recommendation['issues_found'], 1):
                print(f"  {i}. {issue}")
            print()

        print("RECOMMENDATIONS:")
        for i, rec in enumerate(recommendation['recommendations'], 1):
            print(f"  {i}. {rec}")
        print()

        print(f"SUGGESTED APPROACH: {recommendation['suggested_approach']}")
        print()

        # Save detailed results to JSON
        output_file = 'v2_distribution_analysis.json'
        output_data = {
            'basic_statistics': basic_stats,
            'quartile_distribution': quartiles,
            'normality_tests': normality,
            'std_deviation_coverage': std_coverage,
            'outlier_analysis': outliers,
            'component_comparison': component_comparison,
            'score_range_distribution': range_analysis,
            'recommendation': recommendation
        }

        with open(output_file, 'w') as f:
            json.dump(output_data, f, indent=2, default=str)

        print(f"Detailed analysis saved to: {output_file}")
        print()

    finally:
        conn.close()

if __name__ == '__main__':
    main()
