// Legacy templates (existing case-type based)
import type { AdTemplate } from './types.js';
import { carAccident } from './carAccident.js';
import { slipAndFall } from './slipAndFall.js';
import { medicalMalpractice } from './medicalMalpractice.js';
import { truckAccident } from './truckAccident.js';
import { wrongfulDeath } from './wrongfulDeath.js';
import { workplaceInjury } from './workplaceInjury.js';
import { dogBite } from './dogBite.js';
import { rideshareAccident } from './rideshareAccident.js';

export const templates: AdTemplate[] = [
  carAccident,
  slipAndFall,
  medicalMalpractice,
  truckAccident,
  wrongfulDeath,
  workplaceInjury,
  dogBite,
  rideshareAccident,
];

// New format-based system
export { FORMAT_RECIPES, getFormatRecipe, getFormatsByTier } from './formats.js';

export {
  PAIN_VISUALS,
  RELIEF_VISUALS,
  AUTHORITY_VISUALS,
  CTA_VISUALS,
  EDUCATIONAL_VISUALS,
  COMPARISON_VISUALS,
  PATTERN_INTERRUPT_VISUALS,
  OVERLAY_TEMPLATES,
  NARRATION_STYLE_GUIDE,
  REALISM_SUFFIX,
  UGC_STYLE_SUFFIX,
} from './scenes.js';

// Types
export type {
  AdTemplate,
  Scene,
  SceneOverlay,
  AdFormatType,
  CaseType,
  Platform,
  AudienceTemp,
  FunnelStage,
  ClipDuration,
  ClipStructure,
  ScenePrimitive,
  FormatRecipe,
  AudioSource,
  AudioLayer,
  ElevenLabsVoice,
  AdTone,
  ScenePlan,
  AdPlan,
  PlatformConfig,
} from './types.js';

export {
  CLIP_STRUCTURES,
  SCENE_PRIMITIVE_DURATIONS,
  PLATFORM_CONFIGS,
  FORMAT_SELECTION_MATRIX,
  UGC_VISUAL_RULES,
  FALLBACK_VOICES,
} from './types.js';
