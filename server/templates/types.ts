// ---------------------------------------------------------------------------
// Ad Format Types
// ---------------------------------------------------------------------------

/** The 10 ad format categories */
export type AdFormatType =
  | 'hook'                // Short-form hook video (scroll-stopping)
  | 'problem_solution'    // Opens with pain point → presents solution
  | 'ugc'                 // User-generated content / testimonial style
  | 'attorney_direct'     // Founder / face-to-camera
  | 'demo'                // How-it-works / process explainer
  | 'lifestyle'           // Aspirational / life-after-settlement
  | 'comparison'          // Before/after or with/without attorney
  | 'educational'         // Value-first teaching content
  | 'offer'               // Free consultation / promotion CTA
  | 'retargeting';        // Reminder for warm/hot audiences

/** PI case types */
export type CaseType =
  | 'car-accident'
  | 'truck-accident'
  | 'slip-and-fall'
  | 'medical-malpractice'
  | 'wrongful-death'
  | 'workplace-injury'
  | 'dog-bite'
  | 'rideshare-accident';

/** Target platforms — all vertical 9:16 */
export type Platform = 'tiktok' | 'instagram' | 'facebook';

/** Audience temperature for funnel targeting */
export type AudienceTemp = 'cold' | 'warm' | 'hot';

/** Funnel stage */
export type FunnelStage = 'top' | 'mid' | 'bottom';

// ---------------------------------------------------------------------------
// Clip Structures
// ---------------------------------------------------------------------------

/**
 * Valid clip duration combos. Each number is one Grok API call (max 15 sec).
 * Total must be ≤ 30 seconds.
 */
export type ClipDuration = 5 | 10 | 15;

export interface ClipStructure {
  /** Duration of each clip in seconds, e.g. [5, 15, 10] */
  clips: ClipDuration[];
  /** Total duration in seconds */
  total: number;
}

/** All valid clip structures */
export const CLIP_STRUCTURES: ClipStructure[] = [
  { clips: [15], total: 15 },
  { clips: [5, 10], total: 15 },
  { clips: [10, 10], total: 20 },
  { clips: [15, 5], total: 20 },
  { clips: [5, 15], total: 20 },
  { clips: [15, 10], total: 25 },
  { clips: [10, 15], total: 25 },
  { clips: [5, 10, 10], total: 25 },
  { clips: [15, 5, 10], total: 30 },
  { clips: [5, 15, 10], total: 30 },
  { clips: [5, 10, 15], total: 30 },
  { clips: [10, 10, 10], total: 30 },
  { clips: [10, 5, 15], total: 30 },
];

// ---------------------------------------------------------------------------
// Scene Primitives
// ---------------------------------------------------------------------------

/** The building-block scene types */
export type ScenePrimitive =
  | 'pattern_interrupt'   // 5 sec — stop the scroll
  | 'pain_point'          // 5–10 sec — name the problem
  | 'authority_proof'     // 10–15 sec — results, credentials
  | 'social_proof'        // 10–15 sec — testimonial / client story
  | 'attorney_direct'     // 15 sec — face to camera (one clip only)
  | 'educational_tip'     // 10–15 sec — teach something useful
  | 'comparison'          // 10–15 sec — with vs without
  | 'cta'                 // 5 sec — call to action
  | 'urgency';            // 5 sec — statute of limitations, act now

/** Duration ranges for each scene primitive */
export const SCENE_PRIMITIVE_DURATIONS: Record<ScenePrimitive, { min: ClipDuration; max: ClipDuration }> = {
  pattern_interrupt: { min: 5, max: 5 },
  pain_point: { min: 5, max: 10 },
  authority_proof: { min: 10, max: 15 },
  social_proof: { min: 10, max: 15 },
  attorney_direct: { min: 15, max: 15 },
  educational_tip: { min: 10, max: 15 },
  comparison: { min: 10, max: 15 },
  cta: { min: 5, max: 5 },
  urgency: { min: 5, max: 5 },
};

// ---------------------------------------------------------------------------
// Format Recipes (scene primitive sequences per format)
// ---------------------------------------------------------------------------

export interface FormatRecipe {
  formatType: AdFormatType;
  label: string;
  description: string;
  /** Ordered scene primitive sequences (multiple options per format) */
  sequences: ScenePrimitive[][];
  /** Preferred clip structures for this format */
  preferredStructures: ClipDuration[][];
  /** Tier: 1 = high-frequency PI, 2 = situational, 3 = lower priority */
  piTier: 1 | 2 | 3;
}

// ---------------------------------------------------------------------------
// Audio / Voice
// ---------------------------------------------------------------------------

export type AudioSource =
  | 'grok'            // Grok native audio (single clip [15] only)
  | 'elevenlabs'      // ElevenLabs TTS narration layered in post
  | 'music_only'      // Background music track, text overlay carries message
  | 'silent';         // Text overlay only, true sound-off

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

export interface AudioLayer {
  source: AudioSource;
  /** ElevenLabs voice ID — chosen by LLM from available voices */
  voiceId?: string;
  /** ElevenLabs voice name for logging */
  voiceName?: string;
  /** Full narration script timed to total ad duration */
  script?: string;
  /** Background music mood (used alongside narration or alone) */
  musicMood?: 'dramatic' | 'hopeful' | 'urgent' | 'corporate';
}

/** Fallback voices when LLM selection fails or voice is unavailable */
export const FALLBACK_VOICES = {
  male: { voiceId: 'blain', name: 'Blain' },
  female: { voiceId: 'kristen', name: 'Kristen' },
} as const;

// ---------------------------------------------------------------------------
// Scene Plan (LLM output)
// ---------------------------------------------------------------------------

export type AdTone = 'aggressive' | 'empathetic' | 'authoritative' | 'urgent';

export interface ScenePlan {
  /** Which clip in the structure (0-indexed) */
  clipIndex: number;
  /** Duration of this clip */
  duration: ClipDuration;
  /** Scene primitive type */
  primitive: ScenePrimitive;
  /** Grok video generation prompt */
  visualPrompt: string;
  /** On-screen text overlay — the key spoken words from sceneScript displayed as visual transcript */
  textOverlay?: string;
  /** Overlay position */
  overlayPosition: 'top' | 'center' | 'bottom';
  /** The exact narration spoken during this scene's time window */
  sceneScript?: string;
  /** Voice delivery direction for this scene (e.g. "serious and grounded", "BIG energy") */
  toneDirection?: string;
  /** CTA text (last scene only) */
  ctaText?: string;
  /** Whether to show the firm logo */
  showLogo: boolean;
  /** Source for video generation */
  videoSource: 'text' | 'selfie' | 'upload';
  /** Transition to next clip */
  transition: 'cut' | 'fade' | 'swipe';
}

export interface AdPlan {
  /** Unique plan ID */
  id: string;
  /** Target format */
  formatType: AdFormatType;
  /** Target case type */
  caseType: CaseType;
  /** Target platform */
  platform: Platform;
  /** Audience temperature */
  audienceTemp: AudienceTemp;
  /** Ad tone */
  tone: AdTone;
  /** Clip structure chosen */
  clipStructure: ClipDuration[];
  /** Total duration */
  totalDuration: number;
  /** Individual scene plans */
  scenes: ScenePlan[];
  /** Audio layer config */
  audio: AudioLayer;
  /** Legal disclaimer */
  disclaimer: string;
  /** Firm-specific overrides */
  firmName?: string;
  phoneNumber?: string;
  locality?: string;
}

// ---------------------------------------------------------------------------
// Platform Config
// ---------------------------------------------------------------------------

export interface PlatformConfig {
  platform: Platform;
  /** Sweet spot duration range in seconds */
  sweetSpot: { min: number; max: number };
  /** Preferred clip structures for this platform */
  preferredStructures: ClipDuration[][];
  /** Text overlay density: more text on FB, less on TikTok */
  overlayDensity: 'low' | 'medium' | 'high';
  /** CTA style */
  ctaStyle: string;
}

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  tiktok: {
    platform: 'tiktok',
    sweetSpot: { min: 5, max: 15 },
    preferredStructures: [[15], [5, 10]],
    overlayDensity: 'low',
    ctaStyle: 'Link in bio',
  },
  instagram: {
    platform: 'instagram',
    sweetSpot: { min: 15, max: 20 },
    preferredStructures: [[15, 5], [5, 15], [15]],
    overlayDensity: 'medium',
    ctaStyle: 'Link in bio',
  },
  facebook: {
    platform: 'facebook',
    sweetSpot: { min: 15, max: 25 },
    preferredStructures: [[15, 10], [5, 15, 10], [10, 10, 10]],
    overlayDensity: 'high',
    ctaStyle: 'Click below',
  },
};

// ---------------------------------------------------------------------------
// Funnel × Platform → Format Selection Matrix
// ---------------------------------------------------------------------------

export const FORMAT_SELECTION_MATRIX: Record<Platform, Record<AudienceTemp, AdFormatType[]>> = {
  tiktok: {
    cold: ['hook', 'educational', 'problem_solution'],
    warm: ['ugc', 'comparison'],
    hot: [],  // TikTok barely does bottom-funnel for PI
  },
  instagram: {
    cold: ['hook', 'ugc'],
    warm: ['attorney_direct', 'educational'],
    hot: ['retargeting'],
  },
  facebook: {
    cold: ['problem_solution', 'educational'],
    warm: ['comparison', 'attorney_direct'],
    hot: ['retargeting', 'offer'],
  },
};

// ---------------------------------------------------------------------------
// UGC Visual Rules
// ---------------------------------------------------------------------------

export const UGC_VISUAL_RULES = {
  /** Medium-wide or waist-up, handheld phone footage style */
  shotType: 'medium_wide_handheld',
  /** Relatable person doing everyday activities, NOT looking at camera, NOT speaking */
  subjectBehavior: 'activity_with_voiceover',
  /** No visible lip movement — voiceover carries the narration */
  lipMovement: false,
  /** Handheld, friend-filming style, slightly imperfect, authentic */
  cameraStyle: 'handheld_casual',
  /** Background should show recognizable local setting from firm's city */
  backgroundRule: 'local_recognizable_setting',
  /** Single clip [15] can use Grok voice; multi-clip = ElevenLabs voiceover */
  voiceRule: 'single_clip_grok_or_elevenlabs',
} as const;

// ---------------------------------------------------------------------------
// Legacy types (kept for backward compat with existing templates)
// ---------------------------------------------------------------------------

export interface SceneOverlay {
  text?: string;
  position: 'top' | 'center' | 'bottom';
  cta?: string;
  showLogo?: boolean;
}

export interface Scene {
  prompt: string;
  duration: number;
  source: 'text' | 'selfie' | 'upload';
  overlay: SceneOverlay;
}

export interface AdTemplate {
  caseType: string;
  storyline: string;
  scenes: Scene[];
  disclaimer: string;
}
