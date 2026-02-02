import type { AdTemplate } from './types.js';

export const slipAndFall: AdTemplate = {
  caseType: 'slip-and-fall',
  storyline: 'Slip and Fall — Premises liability and getting compensation',
  scenes: [
    {
      prompt:
        'Low-angle close-up, 24mm wide lens. Bright yellow wet floor warning sign on polished commercial tile in a large building lobby. Fluorescent overhead lights reflect off the wet surface creating specular highlights. Slow dolly forward at ground level. Shallow depth of field f/2.8, cool 5600K lighting, slight green fluorescent cast. Film grain, moody desaturated color grade. Photorealistic, cinematic.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Fell on someone else\'s property? They owe you more than an apology.',
        position: 'center',
      },
    },
    {
      prompt:
        'Medium shot, 85mm prime lens f/2.0. Professional attorney in a sharp tailored charcoal suit, reviewing a case file then looking up at camera with a confident, reassuring expression. Hyperrealistic skin detail. Modern office, warm 3200K key light, bookshelves with law volumes in soft background bokeh. Slow dolly in. Photorealistic, cinematic color grade.',
      duration: 5,
      source: 'selfie',
      overlay: {
        text: 'Property owners have a legal duty to keep you safe. Period.',
        position: 'bottom',
      },
    },
    {
      prompt:
        'Close-up, 50mm lens. Medical professional in blue scrubs gently examining a patient knee with an ice pack in a bright hospital room. Handheld camera with subtle organic movement. Warm clinical 5000K lighting, shallow depth of field, skin texture detail. Photorealistic, documentary-feel color grade.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Medical bills. Lost wages. Pain. You shouldn\'t pay for their negligence.',
        position: 'center',
      },
    },
    {
      prompt:
        'Medium close-up, 50mm anamorphic lens. Confident handshake between attorney and client in a modern office. Warm golden 3200K light streaming through windows, rich bokeh background. Camera gently pulls back revealing the professional setting. Shallow depth of field, anamorphic lens flare, premium color grade. Photorealistic.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'No Fee Unless We Win — Zero Risk To You',
        position: 'top',
        cta: 'Call Now: (555) 123-4567',
        showLogo: true,
      },
    },
  ],
  disclaimer:
    'Prior results do not guarantee a similar outcome. Free consultation.',
};
