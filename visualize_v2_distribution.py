"""
Create visual histograms of V2 score distributions
"""

import os
import psycopg2
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from dotenv import load_dotenv
from scipy import stats

load_dotenv()

def connect_db():
    """Connect to PostgreSQL database."""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL environment variable not set")
    return psycopg2.connect(database_url)

def get_scores(conn):
    """Get all scores."""
    query = """
    SELECT
        "compositeScore" as composite_score,
        "housingScore" as housing_score,
        "colScore" as col_score,
        "taxScore" as tax_score
    FROM v2_affordability_score
    WHERE "compositeScore" IS NOT NULL
    """
    return pd.read_sql_query(query, conn)

def create_distribution_plots():
    """Create distribution plots for all scores."""

    conn = connect_db()
    df = get_scores(conn)
    conn.close()

    # Create figure with 4 subplots
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('V2 Affordability Score Distributions', fontsize=16, fontweight='bold')

    scores = [
        ('composite_score', 'Composite Score', axes[0, 0]),
        ('housing_score', 'Housing Score', axes[0, 1]),
        ('col_score', 'Cost of Living Score', axes[1, 0]),
        ('tax_score', 'Tax Score', axes[1, 1])
    ]

    for col_name, title, ax in scores:
        data = df[col_name].dropna()

        # Create histogram
        n, bins, patches = ax.hist(data, bins=50, alpha=0.7, color='steelblue', edgecolor='black')

        # Overlay normal distribution
        mean = data.mean()
        std = data.std()
        x = np.linspace(data.min(), data.max(), 100)
        normal_dist = stats.norm.pdf(x, mean, std) * len(data) * (bins[1] - bins[0])
        ax.plot(x, normal_dist, 'r-', linewidth=2, label='Normal Distribution')

        # Add vertical lines for mean and median
        ax.axvline(mean, color='red', linestyle='--', linewidth=2, label=f'Mean: {mean:.2f}')
        ax.axvline(data.median(), color='green', linestyle='--', linewidth=2, label=f'Median: {data.median():.2f}')

        # Add statistics text
        stats_text = f'Skewness: {stats.skew(data):.3f}\nKurtosis: {stats.kurtosis(data):.3f}\nStd Dev: {std:.2f}'
        ax.text(0.02, 0.98, stats_text, transform=ax.transAxes,
                verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5),
                fontsize=9)

        ax.set_xlabel('Score (0-100, higher = more affordable)', fontsize=11)
        ax.set_ylabel('Frequency', fontsize=11)
        ax.set_title(f'{title}\n(n={len(data):,})', fontsize=12, fontweight='bold')
        ax.legend(loc='upper right', fontsize=9)
        ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig('v2_distribution_plots.png', dpi=300, bbox_inches='tight')
    print("Histogram saved to: v2_distribution_plots.png")

    # Create a second figure comparing composite to components
    fig2, ax2 = plt.subplots(figsize=(14, 8))

    # Plot all distributions on same axes
    ax2.hist(df['composite_score'].dropna(), bins=50, alpha=0.5, label='Composite', color='purple', edgecolor='black')
    ax2.hist(df['housing_score'].dropna(), bins=50, alpha=0.3, label='Housing', color='blue', edgecolor='black')
    ax2.hist(df['col_score'].dropna(), bins=50, alpha=0.3, label='Cost of Living', color='green', edgecolor='black')
    ax2.hist(df['tax_score'].dropna(), bins=50, alpha=0.3, label='Tax', color='red', edgecolor='black')

    ax2.set_xlabel('Score (0-100, higher = more affordable)', fontsize=12)
    ax2.set_ylabel('Frequency', fontsize=12)
    ax2.set_title('V2 Score Distribution Comparison', fontsize=14, fontweight='bold')
    ax2.legend(loc='upper right', fontsize=11)
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig('v2_distribution_comparison.png', dpi=300, bbox_inches='tight')
    print("Comparison plot saved to: v2_distribution_comparison.png")

    # Create Q-Q plot for normality
    fig3, axes3 = plt.subplots(2, 2, figsize=(14, 12))
    fig3.suptitle('Q-Q Plots (Test for Normality)', fontsize=16, fontweight='bold')

    qq_scores = [
        ('composite_score', 'Composite Score', axes3[0, 0]),
        ('housing_score', 'Housing Score', axes3[0, 1]),
        ('col_score', 'Cost of Living Score', axes3[1, 0]),
        ('tax_score', 'Tax Score', axes3[1, 1])
    ]

    for col_name, title, ax in qq_scores:
        data = df[col_name].dropna()
        stats.probplot(data, dist="norm", plot=ax)
        ax.set_title(f'{title}', fontsize=12, fontweight='bold')
        ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig('v2_qq_plots.png', dpi=300, bbox_inches='tight')
    print("Q-Q plots saved to: v2_qq_plots.png")

if __name__ == '__main__':
    create_distribution_plots()
