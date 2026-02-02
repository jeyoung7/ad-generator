import type { AdTemplate } from './types.js';

export const carAccident: AdTemplate = {
  caseType: 'car-accident',
  storyline: 'Car Accident — Dramatic highway aftermath leading to justice',
  scenes: [
    {
      prompt:
        'Cinematic wide shot, 35mm anamorphic lens. Dramatic car accident aftermath on a rain-soaked four-lane highway at night. Two crumpled vehicles, shattered glass on wet asphalt catching red and blue emergency light reflections. Slow dolly in from 20 feet. Volumetric fog from engine steam, rain droplets visible in headlight beams. Color temperature 4500K mixed with emergency strobes. Shallow depth of field f/1.8, film grain, desaturated teal-and-orange color grade. Photorealistic, cinematic.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Injured in a crash? Here\'s what they won\'t tell you.',
        position: 'center',
      },
    },
    {
      prompt:
        'Medium close-up, 85mm prime lens f/2.0. Professional attorney in a sharp tailored navy suit, speaking directly to camera with calm authority. Hyperrealistic skin detail, micro-expressions of empathy. Modern corner office, warm 3200K key light from left, soft fill from window. Slow dolly in over 5 seconds. Shallow depth of field, bokeh from city lights behind. Photorealistic, cinematic color grade.',
      duration: 5,
      source: 'selfie',
      overlay: {
        text: 'Insurance companies settle fast and low. Don\'t let them.',
        position: 'bottom',
      },
    },
    {
      prompt:
        'Extreme close-up, macro lens. A gavel striking a sound block in a courtroom — slow motion at 120fps. Dramatic hard sidelight 5600K casting long shadows across dark mahogany. Dust motes suspended in the light beam. Shallow depth of field, motion blur on the gavel arc, fine wood grain detail. Photorealistic, cinematic, high contrast color grade.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Our clients recover 3x more than those without an attorney.',
        position: 'center',
      },
    },
    {
      prompt:
        'Medium shot, 50mm anamorphic lens. Gold scales of justice on a dark marble pedestal, camera slowly orbiting 180 degrees. Cinematic backlight with warm 3200K highlights, deep blacks, rim light separating subject from background. Anamorphic lens flare. Shallow depth of field, premium color grade. Photorealistic.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Free Case Review — $0 Unless We Win',
        position: 'top',
        cta: 'Call Now: (555) 123-4567',
        showLogo: true,
      },
    },
  ],
  disclaimer:
    'Prior results do not guarantee a similar outcome. Free consultation.',
};
