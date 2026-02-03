import type { AdTemplate } from './types.js';

export const workplaceInjury: AdTemplate = {
  caseType: 'workplace-injury',
  storyline:
    'Workplace Injury — Your employer cannot legally retaliate against you',
  scenes: [
    {
      prompt:
        'Dramatic low-angle shot, 24mm wide lens. Construction site at dawn. A hard hat rolls across concrete ground in slow motion toward camera. Backlit dust particles floating in warm 3200K morning sun. Fast whip pan upward revealing steel beams and crane overhead. High contrast, film grain, shallow depth of field. Photorealistic, cinematic color grade.',
      duration: 5,
      source: 'text',
      overlay: {
        text: "Hurt at work in {city}? They can't fire you for filing a claim. It's the law.",
        position: 'center',
      },
    },
    {
      prompt:
        'Medium close-up, 85mm prime lens f/1.8. Determined attorney in a sharp tailored charcoal suit, speaking directly to camera with authority and conviction. Hyperrealistic skin detail. Standing in front of a wall of leather-bound legal volumes and framed credentials. Dramatic 3200K key light from right, creating chiaroscuro. Slow dolly in. Shallow depth of field. Photorealistic, cinematic color grade.',
      duration: 5,
      source: 'selfie',
      overlay: {
        text: 'Federal law protects you. Retaliation is illegal. Full stop.',
        position: 'bottom',
      },
    },
    {
      prompt:
        'Close-up, 50mm lens. Official workers compensation claim form on a dark wood desk, a hand signing with a pen. Camera slides laterally revealing dollar figures on medical bills and an X-ray film. Warm 3200K desk lamp lighting, shallow depth of field f/2.0, fine paper texture detail. Photorealistic, documentary-feel cinematic color grade.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Medical bills. Lost wages. Pain and suffering. All recoverable.',
        position: 'center',
      },
    },
    {
      prompt:
        'Street-level tracking shot, 35mm wide lens. Moving along a recognizable {city} suburban office park at golden hour. Camera pushes toward a single illuminated office building beside local businesses. Warm 2800K tones, dramatic cloud formations, cinematic horizontal lens flare, anamorphic bokeh. Photorealistic, premium color grade.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Free & Confidential — No Fee Unless We Win',
        position: 'top',
        cta: 'Call Now: (555) 123-4567',
        showLogo: true,
      },
    },
  ],
  disclaimer:
    'Prior results do not guarantee a similar outcome. Free consultation.',
};
