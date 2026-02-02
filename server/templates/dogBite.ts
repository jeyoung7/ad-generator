import type { AdTemplate } from './types.js';

export const dogBite: AdTemplate = {
  caseType: 'dog-bite',
  storyline:
    'Dog Bite — The owner is liable even if the dog has never bitten before',
  scenes: [
    {
      prompt:
        'Extreme close-up, 35mm lens. Chain-link fence rattling violently from impact, a large aggressive dog lunging behind it. Slow motion at 120fps. Camera shakes with each impact. Dramatic hard backlighting 5600K, shallow depth of field f/2.0, film grain. Fast zoom out to wide shot of a suburban neighborhood. Photorealistic, visceral cinematic color grade.',
      duration: 5,
      source: 'text',
      overlay: {
        text: "Bitten by a dog in {city}? The owner is liable — no matter what they say.",
        position: 'center',
      },
    },
    {
      prompt:
        'Medium shot, 85mm prime lens f/2.0. Professional attorney in a sharp tailored suit, speaking with empathy and quiet confidence to camera. Hyperrealistic skin detail, warm micro-expressions. Modern bright office, large window with soft natural 5600K light behind creating a gentle fill. Slow dolly in. Shallow depth of field, clean warm tones. Photorealistic, cinematic color grade.',
      duration: 5,
      source: 'selfie',
      overlay: {
        text: "It's called strict liability. The law is on YOUR side.",
        position: 'bottom',
      },
    },
    {
      prompt:
        'Close-up, 50mm lens. Medical professional in blue gloves carefully cleaning and dressing a wound on a patient forearm. Clinical white 5600K lighting, sterile environment. Camera slowly tracks along the bandaging process. Shallow depth of field, hyperrealistic skin and texture detail. Photorealistic, clinical cinematic color grade.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Surgeries. Scars. Infections. You deserve every dollar.',
        position: 'center',
      },
    },
    {
      prompt:
        'Golden hour shot, 35mm anamorphic lens. Peaceful {city} residential street, camera slowly tracking along a tree-lined sidewalk. Warm dappled 2800K light filtering through leaves, cinematic depth, horizontal anamorphic lens flare. Photorealistic, warm reassuring color grade.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Free Case Review — No Fee Unless We Win',
        position: 'top',
        cta: 'Call Now: (555) 123-4567',
        showLogo: true,
      },
    },
  ],
  disclaimer:
    'Prior results do not guarantee a similar outcome. Free consultation.',
};
