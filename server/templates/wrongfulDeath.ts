import type { AdTemplate } from './types.js';

export const wrongfulDeath: AdTemplate = {
  caseType: 'wrongful-death',
  storyline:
    'Wrongful Death — The statute of limitations is shorter than you think',
  scenes: [
    {
      prompt:
        'Slow motion, 50mm prime lens f/1.4. Close-up of an empty chair at a family dinner table. A single place setting untouched, napkin folded. Warm candlelight 2800K flickers across the scene casting gentle dancing shadows. Camera slowly dollies in over 5 seconds. Extremely shallow depth of field, warm lighting with deep surrounding shadows. Film grain, emotional warm color grade. Photorealistic, cinematic.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Someone you love was taken too soon. The law gives you a deadline to act.',
        position: 'center',
      },
    },
    {
      prompt:
        'Medium shot, 85mm prime lens f/2.0. Compassionate attorney in a sharp tailored dark suit, speaking gently but firmly to camera. Hyperrealistic skin detail, micro-expressions of genuine empathy. Seated in a warm private office, soft 3200K bookshelf lighting behind. Slow dolly in. Shallow depth of field, rich warm tones. Photorealistic, cinematic color grade.',
      duration: 5,
      source: 'selfie',
      overlay: {
        text: "Most families don't know the clock is already running.",
        position: 'bottom',
      },
    },
    {
      prompt:
        'Extreme close-up, macro lens. Antique courtroom clock face, second hand ticking in slow motion. Camera slowly pushes in as the lighting shifts from warm 3200K to cold 6500K blue. Dust motes floating in a narrow beam of light. Dramatic shallow depth of field, tension-building cinematic color grade transitioning warm to cold. Photorealistic.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'Every day you wait, evidence fades and witnesses forget.',
        position: 'center',
      },
    },
    {
      prompt:
        'Wide shot, 35mm anamorphic lens. Family silhouette walking together at golden hour sunset in a {city} park. Camera gently pulls back. Warm 2800K backlight, horizontal anamorphic lens flare, rich golden tones. Cinematic depth, anamorphic bokeh. Photorealistic, hopeful color grade.',
      duration: 5,
      source: 'text',
      overlay: {
        text: 'We Fight For Families — Not Insurance Companies',
        position: 'top',
        cta: 'Call Now: (555) 123-4567',
        showLogo: true,
      },
    },
  ],
  disclaimer:
    'Prior results do not guarantee a similar outcome. Free consultation.',
};
