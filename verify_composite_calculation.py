#!/usr/bin/env python3
"""
Verify composite score calculation for Wichita, KS
"""

# Component weights from calculate_v2_scores.py
HOUSING_WEIGHT = 0.40
COL_WEIGHT = 0.30
TAX_WEIGHT = 0.20
QOL_WEIGHT = 0.10

# Wichita scores from database
housing_score = 68.2184558199669
col_score = None  # Not available
tax_score = 21.1288375780899
qol_score = None  # Not available

stored_composite = 68.2184558199669

print("=" * 80)
print("WICHITA, KS - COMPOSITE SCORE VERIFICATION")
print("=" * 80)

print("\nComponent Scores from Database:")
print(f"  Housing Score: {housing_score}")
print(f"  COL Score: {col_score}")
print(f"  Tax Score: {tax_score}")
print(f"  QOL Score: {qol_score}")
print(f"  Stored Composite: {stored_composite}")

print("\n" + "=" * 80)
print("WEIGHT NORMALIZATION CALCULATION")
print("=" * 80)

# Following the logic in calculate_composite_score() from calculate_v2_scores.py
components = []
weights = []

if housing_score is not None:
    components.append(housing_score)
    weights.append(HOUSING_WEIGHT)
    print(f"\nAdding Housing: score={housing_score:.2f}, weight={HOUSING_WEIGHT}")

if col_score is not None:
    components.append(col_score)
    weights.append(COL_WEIGHT)
    print(f"Adding COL: score={col_score:.2f}, weight={COL_WEIGHT}")

if tax_score is not None:
    components.append(tax_score)
    weights.append(TAX_WEIGHT)
    print(f"Adding Tax: score={tax_score:.2f}, weight={TAX_WEIGHT}")

if qol_score is not None:
    components.append(qol_score)
    weights.append(QOL_WEIGHT)
    print(f"Adding QOL: score={qol_score:.2f}, weight={QOL_WEIGHT}")

print(f"\nTotal weight before normalization: {sum(weights)}")
print(f"Components: {len(components)}")

# Normalize weights to sum to 1.0
total_weight = sum(weights)
normalized_weights = [w / total_weight for w in weights]

print("\nNormalized Weights:")
for i, (comp, orig_weight, norm_weight) in enumerate(zip(components, weights, normalized_weights)):
    labels = ['Housing', 'COL', 'Tax', 'QOL']
    label = labels[i] if i < len(labels) else f'Component {i}'
    print(f"  {label}: original={orig_weight:.2f} -> normalized={norm_weight:.4f} ({norm_weight*100:.2f}%)")

# Calculate weighted average
composite_score = sum(c * w for c, w in zip(components, normalized_weights))

print("\n" + "=" * 80)
print("COMPOSITE CALCULATION")
print("=" * 80)

calculation_str = " + ".join([
    f"{comp:.2f} * {norm_w:.4f}"
    for comp, norm_w in zip(components, normalized_weights)
])
print(f"\nFormula: {calculation_str}")
print(f"Result: {composite_score:.10f}")

print("\n" + "=" * 80)
print("VERIFICATION")
print("=" * 80)

print(f"\nExpected Composite (calculated): {composite_score:.10f}")
print(f"Stored Composite (database): {stored_composite:.10f}")
match_status = "YES [OK]" if abs(composite_score - stored_composite) < 0.0001 else "NO [ERROR]"
print(f"Match: {match_status}")
print(f"Difference: {abs(composite_score - stored_composite):.10f}")

print("\n" + "=" * 80)
print("ANALYSIS")
print("=" * 80)

print("\nThe issue is clear:")
print("- Only Housing (68.22) and Tax (21.13) scores are available")
print("- Original weights: Housing=0.40, Tax=0.20")
print("- After normalization: Housing=0.6667, Tax=0.3333")
print(f"- Calculated composite: {composite_score:.2f}")
print(f"- BUT database shows: {stored_composite:.2f}")
print("\nThe database composite equals the housing score exactly!")
print("This suggests the composite calculation is NOT using weight normalization")
print("or there's a bug where it's only using the housing score.")

print("\n" + "=" * 80)
print("EXPECTED UI DISPLAY")
print("=" * 80)

print("\nBased on correct calculation:")
print(f"  V2 Composite Score: {composite_score:.0f}/100")
print(f"  V2 Housing Component: {housing_score:.0f}")
print(f"  V2 Taxes Component: {tax_score:.0f}")

print("\nWhat the screenshot shows:")
print(f"  V2 Composite Score: 68/100")
print(f"  V2 Housing Component: 68")
print(f"  V2 Taxes Component: 21")

print("\n[X] ISSUE CONFIRMED: The composite score should be ~53, not 68!")
print("The database is incorrectly storing the housing score as the composite score.")
