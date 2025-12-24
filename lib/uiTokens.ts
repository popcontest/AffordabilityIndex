/**
 * AffordabilityIndex UI Design Tokens
 *
 * Type-safe access to CSS custom properties defined in globals.css
 * Inspired by Behance 2025: Sunkissed Sierra, Flower Power, Designed to Move
 */

export const tokens = {
  // Backgrounds & Surfaces
  bg: 'var(--ai-bg)',
  surface: 'var(--ai-surface)',
  surfaceElevated: 'var(--ai-surface-elevated)',
  border: 'var(--ai-border)',
  borderMuted: 'var(--ai-border-muted)',

  // Text hierarchy
  text: 'var(--ai-text)',
  textMuted: 'var(--ai-text-muted)',
  textSubtle: 'var(--ai-text-subtle)',

  // Sunkissed Sierra - warm accent
  warm: 'var(--ai-warm)',
  warmHover: 'var(--ai-warm-hover)',
  warmLight: 'var(--ai-warm-light)',
  warmSubtle: 'var(--ai-warm-subtle)',

  // Primary brand
  primary: 'var(--ai-primary)',
  primaryHover: 'var(--ai-primary-hover)',
  primaryLight: 'var(--ai-primary-light)',
  primaryContrast: 'var(--ai-primary-contrast)',

  // Semantic colors
  positive: 'var(--ai-positive)',
  positiveLight: 'var(--ai-positive-light)',
  caution: 'var(--ai-caution)',
  cautionLight: 'var(--ai-caution-light)',
  negative: 'var(--ai-negative)',
  negativeLight: 'var(--ai-negative-light)',

  // Radius
  radiusSm: 'var(--ai-radius-sm)',
  radiusMd: 'var(--ai-radius-md)',
  radiusCard: 'var(--ai-radius-card)',
  radiusLg: 'var(--ai-radius-lg)',

  // Shadows
  shadowSm: 'var(--ai-shadow-sm)',
  shadowCard: 'var(--ai-shadow-card)',
  shadowCardHover: 'var(--ai-shadow-card-hover)',
  shadowLg: 'var(--ai-shadow-lg)',

  // Spacing
  spaceSection: 'var(--ai-space-section)',
  spaceSectionSm: 'var(--ai-space-section-sm)',
  spaceStackLg: 'var(--ai-space-stack-lg)',
  spaceStack: 'var(--ai-space-stack)',
  spaceStackSm: 'var(--ai-space-stack-sm)',
} as const;

/**
 * Tailwind className helpers for common token patterns
 */
export const tw = {
  // Card styles
  card: 'bg-ai-surface border border-ai-border rounded-[var(--ai-radius-card)] shadow-[var(--ai-shadow-card)]',
  cardHover: 'hover:shadow-[var(--ai-shadow-card-hover)] transition-shadow duration-200',

  // Surface backgrounds
  bgNeutral: 'bg-ai-bg',
  bgSurface: 'bg-ai-surface',
  bgSurfaceElevated: 'bg-ai-surface-elevated',

  // Text styles
  textPrimary: 'text-ai-text',
  textMuted: 'text-ai-text-muted',
  textSubtle: 'text-ai-text-subtle',

  // Accent (Sunkissed Sierra)
  accentWarm: 'text-ai-warm',
  bgWarm: 'bg-ai-warm',
  bgWarmLight: 'bg-ai-warm-light',
  bgWarmSubtle: 'bg-ai-warm-subtle',

  // Semantic
  positive: 'text-ai-positive',
  bgPositive: 'bg-ai-positive-light',
  caution: 'text-ai-caution',
  bgCaution: 'bg-ai-caution-light',
  negative: 'text-ai-negative',
  bgNegative: 'bg-ai-negative-light',

  // Section spacing
  sectionPadding: 'py-[var(--ai-space-section)]',
  sectionPaddingSm: 'py-[var(--ai-space-section-sm)]',
} as const;

/**
 * Type-safe color palette for direct usage
 */
export type TokenColor = keyof typeof tokens;

/**
 * Helper to get CSS variable value at runtime
 */
export function getTokenValue(token: TokenColor): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement)
    .getPropertyValue(tokens[token].replace('var(', '').replace(')', ''))
    .trim();
}
