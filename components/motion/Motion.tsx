'use client';

/**
 * Motion Components - Client-side wrappers for Framer Motion
 *
 * Inspired by Behance 2025 "Designed to Move" trend:
 * - Subtle, meaningful animations
 * - Enhance comprehension, not distraction
 * - Performance-focused with reduced motion support
 *
 * Since Next.js App Router defaults to server components,
 * these client components wrap Framer Motion for use in server-rendered pages.
 */

import { motion, Variants } from 'framer-motion';

// Re-export motion primitives as client components
export const MotionDiv = motion.div;
export const MotionSection = motion.section;
export const MotionArticle = motion.article;
export const MotionSpan = motion.span;
export const MotionP = motion.p;
export const MotionH1 = motion.h1;
export const MotionH2 = motion.h2;
export const MotionH3 = motion.h3;

/**
 * Animation variants for common patterns
 */

// Fade in from bottom (subtle y offset)
export const fadeInUp: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1], // Ease-out-cubic
    },
  },
};

// Fade in with scale (subtle zoom)
export const fadeInScale: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

// Stagger children animations
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

// Card hover lift (micro-interaction)
export const cardHover: Variants = {
  initial: {
    y: 0,
    boxShadow: 'var(--ai-shadow-card)',
  },
  hover: {
    y: -4,
    boxShadow: 'var(--ai-shadow-card-hover)',
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

// Score fill animation (progress/achievement)
export const scoreFill = (score: number): Variants => ({
  initial: {
    width: '0%',
  },
  animate: {
    width: `${score}%`,
    transition: {
      duration: 0.6,
      delay: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
});

// Number count-up animation
export const numberCountUp = (from: number, to: number): Variants => ({
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.4,
    },
  },
});

/**
 * Reduced motion preferences
 * Automatically respects user's prefers-reduced-motion setting
 */
export const reducedMotionVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
};

/**
 * Preset animation configurations
 */
export const presets = {
  // Page section entrance
  section: {
    initial: 'initial',
    whileInView: 'animate',
    viewport: { once: true, margin: '-50px' },
    variants: fadeInUp,
  },

  // Card entrance
  card: {
    initial: 'initial',
    whileInView: 'animate',
    whileHover: 'hover',
    viewport: { once: true, margin: '-20px' },
    variants: { ...fadeInScale, ...cardHover },
  },

  // Staggered list
  list: {
    initial: 'initial',
    whileInView: 'animate',
    viewport: { once: true },
    variants: staggerContainer,
  },

  // Score/metric display
  metric: {
    initial: 'initial',
    animate: 'animate',
    variants: fadeInScale,
  },
} as const;
