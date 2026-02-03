import type { AdTemplate } from './types.js';

export const rideshareAccident: AdTemplate = {
  caseType: 'rideshare-accident',
  storyline:
    'Rideshare Accident — Uber and Lyft carry $1M policies most passengers never claim',
  scenes: [
    {
      prompt:
        'Close-up, 50mm lens. Smartphone screen showing a rideshare app with a car icon arriving. Abrupt smash cut to dramatic slow-motion side-impact collision at a {city} intersection at night. Glass shards fly toward camera. Rain-soaked street, red and blue emergency strobes reflecting off wet asphalt. High contrast, film grain, 4500K mixed lighting. Photorealistic, cinematic color grade.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Your Uber ride has a $1 MILLION insurance policy. They hope you never use it.',
        position: 'center',
      },
    },
    {
      prompt:
        'Medium close-up, 85mm prime lens f/1.8. Sharp attorney in a tailored professional suit, leaning slightly forward, speaking to camera with intensity and conviction. Hyperrealistic skin detail, focused eyes. Sleek modern office with a recognizable {city} street intersection and storefront signage visible through floor-to-ceiling windows at night. Warm 3200K key light, dramatic contrast. Slow dolly in. Shallow depth of field. Photorealistic, cinematic color grade.',
      duration: 5,
      source: 'selfie',
      overlay: {
        text: 'Uber and Lyft have billion-dollar legal teams. You need one call.',
        position: 'bottom',
      },
    },
    {
      prompt:
        'Dramatic close-up, macro lens. Insurance policy documents on a desk with "$1,000,000" coverage amount highlighted in bold. Camera slowly pushes in. A pen circles the figure. Warm 3200K desk lamp lighting, shallow depth of field f/2.8, paper texture hyperrealistic detail. Film grain, documentary-feel cinematic color grade. Photorealistic.',
      duration: 5,
      source: 'text',
      overlay: {
        text: "$1M minimum coverage exists for every ride. It's your right to claim it.",
        position: 'center',
      },
    },
    {
      prompt:
        'Wide cinematic shot, 35mm anamorphic lens. {city} city streets at night, rideshare vehicles moving through traffic. Neon signs and streetlights reflecting off wet pavement. Camera mounted low, tracking forward. Dramatic urban lighting, anamorphic horizontal bokeh streaks, film grain. Photorealistic, premium cinematic color grade.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Free Claim Review — We Handle Everything',
        position: 'top',
        cta: 'Call Now: (555) 123-4567',
        showLogo: true,
      },
    },
  ],
  disclaimer:
    'Prior results do not guarantee a similar outcome. Free consultation.',
};
