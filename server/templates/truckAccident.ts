import type { AdTemplate } from './types.js';

export const truckAccident: AdTemplate = {
  caseType: 'truck-accident',
  storyline:
    'Truck Accident — Did you know trucking companies destroy evidence in 24 hours?',
  scenes: [
    {
      prompt:
        'Extreme close-up, 24mm anamorphic lens. Massive 18-wheeler truck grille filling the frame, headlights blazing through dense volumetric fog on a highway at night. Fast zoom out revealing a jack-knifed semi across multiple lanes. Emergency flares on wet asphalt, red and blue strobes reflecting off rain puddles. Color temperature 4500K mixed with emergency lighting. Film grain, high contrast, teal-and-orange color grade. Photorealistic, cinematic.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Trucking companies start erasing evidence in 24 hours. Yours included.',
        position: 'center',
      },
    },
    {
      prompt:
        'Medium close-up, 85mm prime lens f/1.8. Professional attorney in a sharp tailored navy suit, speaking directly to camera with urgent conviction. Hyperrealistic skin detail, micro-expressions of intensity. Modern glass corner office with a recognizable {city} street-level corridor and storefronts visible through windows behind. Warm 3200K key light from left. Slow dolly in. Shallow depth of field, rich contrast. Photorealistic, cinematic color grade.',
      duration: 5,
      source: 'selfie',
      overlay: {
        text: 'Black boxes. Driver logs. GPS data. They erase it all.',
        position: 'bottom',
      },
    },
    {
      prompt:
        'Close-up, macro lens. Gloved hand carefully extracting a damaged electronic black box recorder from a commercial truck cab wreckage. Sparks and metallic debris. Dramatic hard sidelight 5600K, shallow depth of field f/2.0. Camera racks focus from the device to scattered DOT compliance paperwork. Desaturated cinematic color grade, film grain. Photorealistic.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'We lock down evidence before they destroy it.',
        position: 'center',
      },
    },
    {
      prompt:
        'Wide cinematic shot, 35mm anamorphic lens. {city} street-level legal district at golden hour, camera slowly tilting down from tree canopy to reveal a single lit office window above local storefronts. Warm 2800K golden light spills out. Dramatic cumulus clouds, rich warm tones, anamorphic horizontal lens flare. Shallow depth of field, premium color grade. Photorealistic.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Free Case Review — The Clock Is Already Ticking',
        position: 'top',
        cta: 'Call Now: (555) 123-4567',
        showLogo: true,
      },
    },
  ],
  disclaimer:
    'Prior results do not guarantee a similar outcome. Free consultation.',
};
