import type { AdTemplate } from './types.js';

export const medicalMalpractice: AdTemplate = {
  caseType: 'medical-malpractice',
  storyline: 'Medical Malpractice — Holding healthcare providers accountable',
  scenes: [
    {
      prompt:
        'Tracking shot, 35mm anamorphic lens. Slowly moving down a dimly lit hospital corridor at night. An empty wheelchair sits in the center of frame. Overhead fluorescent lights flicker casting intermittent shadows. Slow dolly forward. Volumetric haze, cool 5600K with green fluorescent cast, deep shadows. Shallow depth of field, film grain, desaturated cinematic color grade. Photorealistic.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Doctors make mistakes. You shouldn\'t pay the price.',
        position: 'center',
      },
    },
    {
      prompt:
        'Medium shot, 85mm prime lens f/1.8. Attorney in a sharp tailored dark suit standing confidently in a law library. Hyperrealistic skin detail, subtle expression of determination. Dark wood bookshelves behind, warm 3200K sidelight from a brass desk lamp creating dramatic chiaroscuro. Slow dolly in. Shallow depth of field, rich warm tones. Photorealistic, cinematic color grade.',
      duration: 5,
      source: 'selfie',
      overlay: {
        text: 'Medical records don\'t lie. We know how to read them.',
        position: 'bottom',
      },
    },
    {
      prompt:
        'Close-up, macro lens. Medical records, prescription bottles, and a stethoscope on a polished dark wood desk. Camera slides laterally across the documents, revealing highlighted text. Dramatic 3200K sidelight casting long shadows, shallow depth of field, paper texture detail. Film grain, cinematic color grade. Photorealistic.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Millions recovered for families just like yours.',
        position: 'center',
      },
    },
    {
      prompt:
        'Low-angle shot, 24mm wide lens. Bronze Lady Justice statue holding scales against a dramatic cloudy sky at dusk. Golden 2800K backlight creating a powerful silhouette with warm rim lighting. Camera slowly tilts upward. Shallow depth of field, anamorphic bokeh, rich blacks and warm highlights. Photorealistic, premium color grade.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Free Case Review — Confidential & No Obligation',
        position: 'top',
        cta: 'Call Now: (555) 123-4567',
        showLogo: true,
      },
    },
  ],
  disclaimer:
    'Prior results do not guarantee a similar outcome. Free consultation.',
};
