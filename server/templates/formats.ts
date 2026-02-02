import type { FormatRecipe } from './types.js';

/**
 * Format recipes define what scene primitive sequences make sense for each
 * ad format, along with preferred clip structures and PI relevance tier.
 */
export const FORMAT_RECIPES: FormatRecipe[] = [
  // ── Tier 1: High-frequency PI formats ──────────────────────────────────

  {
    formatType: 'hook',
    label: 'Short-Form Hook',
    description: 'Pattern interrupt in the first second. Scroll-stopping, not depth.',
    sequences: [
      ['pattern_interrupt', 'pain_point', 'cta'],
      ['pattern_interrupt', 'authority_proof'],
      ['pattern_interrupt'],
    ],
    preferredStructures: [[15], [5, 10], [5, 15]],
    piTier: 1,
  },

  {
    formatType: 'problem_solution',
    label: 'Problem → Solution',
    description: 'Opens with relatable pain point, names the frustration, then presents the attorney as the solution.',
    sequences: [
      ['pain_point', 'authority_proof', 'cta'],
      ['pattern_interrupt', 'pain_point', 'authority_proof'],
      ['pain_point', 'social_proof', 'cta'],
    ],
    preferredStructures: [[5, 15, 10], [5, 15], [5, 10, 15]],
    piTier: 1,
  },

  {
    formatType: 'ugc',
    label: 'UGC / Testimonial',
    description: 'Informal testimonial style. Medium-wide shots, no close-up faces. Social proof is the hero.',
    sequences: [
      ['social_proof'],
      ['social_proof', 'cta'],
      ['pattern_interrupt', 'social_proof', 'cta'],
    ],
    preferredStructures: [[15], [15, 5], [5, 15, 10]],
    piTier: 1,
  },

  {
    formatType: 'attorney_direct',
    label: 'Attorney Face-to-Camera',
    description: 'Direct eye contact builds credibility. One attorney clip anchors the ad.',
    sequences: [
      ['attorney_direct'],
      ['attorney_direct', 'cta'],
      ['attorney_direct', 'authority_proof'],
    ],
    preferredStructures: [[15], [15, 5], [15, 10]],
    piTier: 1,
  },

  {
    formatType: 'educational',
    label: 'Educational / Value-First',
    description: 'Teaches something useful without selling upfront. Positions firm as expert.',
    sequences: [
      ['educational_tip', 'educational_tip', 'cta'],
      ['pattern_interrupt', 'educational_tip', 'authority_proof'],
      ['educational_tip', 'authority_proof', 'cta'],
    ],
    preferredStructures: [[10, 10, 10], [5, 15, 10], [10, 15, 5]],
    piTier: 1,
  },

  // ── Tier 2: Situational PI formats ─────────────────────────────────────

  {
    formatType: 'comparison',
    label: 'Comparison / Before-After',
    description: 'Side-by-side contrast. With attorney vs without. Settlement amounts.',
    sequences: [
      ['comparison', 'authority_proof'],
      ['pain_point', 'comparison', 'cta'],
      ['comparison', 'cta'],
    ],
    preferredStructures: [[15, 10], [5, 15, 10], [15, 5]],
    piTier: 2,
  },

  {
    formatType: 'retargeting',
    label: 'Retargeting / Reminder',
    description: 'Assumes prior awareness. Shorter, emphasizes objections/proof/urgency.',
    sequences: [
      ['urgency', 'social_proof', 'cta'],
      ['urgency', 'authority_proof'],
      ['social_proof', 'cta'],
    ],
    preferredStructures: [[5, 10], [15, 5], [15]],
    piTier: 2,
  },

  {
    formatType: 'offer',
    label: 'Offer / Free Consultation',
    description: 'Clear incentive, direct CTA. Free consultation, no fee unless we win.',
    sequences: [
      ['authority_proof', 'cta'],
      ['pain_point', 'cta'],
      ['urgency', 'authority_proof', 'cta'],
    ],
    preferredStructures: [[15, 5], [10, 5], [5, 15, 10]],
    piTier: 2,
  },

  // ── Tier 3: Lower priority for PI ──────────────────────────────────────

  {
    formatType: 'demo',
    label: 'How-It-Works / Process',
    description: 'Explains the legal process step by step. Removes friction and uncertainty.',
    sequences: [
      ['educational_tip', 'educational_tip', 'cta'],
      ['pain_point', 'educational_tip', 'cta'],
    ],
    preferredStructures: [[10, 10, 10], [5, 15, 10]],
    piTier: 3,
  },

  {
    formatType: 'lifestyle',
    label: 'Lifestyle / Aspirational',
    description: 'Life after settlement. Emotion-forward, minimal copy. Sells recovery and justice.',
    sequences: [
      ['pain_point', 'social_proof', 'cta'],
      ['social_proof', 'authority_proof'],
    ],
    preferredStructures: [[5, 15, 10], [15, 10]],
    piTier: 3,
  },
];

/** Lookup a format recipe by type */
export function getFormatRecipe(formatType: string): FormatRecipe | undefined {
  return FORMAT_RECIPES.find((r) => r.formatType === formatType);
}

/** Get formats filtered by PI tier */
export function getFormatsByTier(tier: 1 | 2 | 3): FormatRecipe[] {
  return FORMAT_RECIPES.filter((r) => r.piTier <= tier);
}
