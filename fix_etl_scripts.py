"""
Quick script to add ID generation and fix column names in all ETL scripts.
"""

import re

ID_GENERATION_CODE = '''
def generate_cuid() -> str:
    """Generate a simple unique ID similar to Prisma's cuid."""
    import secrets
    import string
    chars = string.ascii_lowercase + string.digits
    return 'c' + ''.join(secrets.choice(chars) for _ in range(24))
'''

scripts_to_fix = [
    'import_transportation.py',
    'import_childcare.py',
    'import_healthcare.py',
    'import_property_tax.py',
]

for script_name in scripts_to_fix:
    print(f"Fixing {script_name}...")

    with open(script_name, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add ID generation function after DATABASE_URL
    if 'def generate_cuid' not in content:
        content = content.replace(
            'DATABASE_URL = "postgresql://',
            f'{ID_GENERATION_CODE}\nDATABASE_URL = "postgresql://'
        )

    # Add imports if not present
    if 'import secrets' not in content:
        content = content.replace(
            'import sys\nimport io',
            'import sys\nimport io\nimport secrets\nimport string'
        )

    with open(script_name, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  ✓ {script_name} updated")

print("\n✅ All scripts updated!")
print("Now run each script individually to populate data.")
