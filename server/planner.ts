import { v4 as uuid } from 'uuid';
import {
  getVoiceCatalogForLLM,
  resolveVoiceId,
} from './elevenlabs.js';
import { getFormatRecipe, FORMAT_RECIPES } from './templates/formats.js';
import {
  NARRATION_STYLE_GUIDE,
  PAIN_VISUALS,
  RELIEF_VISUALS,
  AUTHORITY_VISUALS,
  CTA_VISUALS,
  EDUCATIONAL_VISUALS,
  COMPARISON_VISUALS,
  PATTERN_INTERRUPT_VISUALS,
  OVERLAY_TEMPLATES,
  REALISM_SUFFIX,
  UGC_STYLE_SUFFIX,
} from './templates/scenes.js';
import {
  PLATFORM_CONFIGS,
  FORMAT_SELECTION_MATRIX,
  UGC_VISUAL_RULES,
  CLIP_STRUCTURES,
  type AdPlan,
  type ScenePlan,
  type AdFormatType,
  type CaseType,
  type Platform,
  type AudienceTemp,
  type AdTone,
  type AudioSource,
  type ClipDuration,
} from './templates/types.js';

// ---------------------------------------------------------------------------
// LLM Interface (xAI Grok via OpenAI-compatible chat completions)
// ---------------------------------------------------------------------------

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = 'https://api.x.ai/v1';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callLLM(
  systemPrompt: string,
  messages: LLMMessage[],
  maxTokens = 4096
): Promise<string> {
  if (!XAI_API_KEY) {
    console.warn('[planner] No XAI_API_KEY set, using deterministic fallback');
    return '';
  }

  const allMessages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const res = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${XAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-3',
      max_tokens: maxTokens,
      messages: allMessages,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`xAI API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return (data as any).choices?.[0]?.message?.content ?? '';
}

// ---------------------------------------------------------------------------
// Plan Generation
// ---------------------------------------------------------------------------

export interface PlanRequest {
  caseType: CaseType;
  platform: Platform;
  audienceTemp: AudienceTemp;
  /** Optional: override the LLM's format choice */
  formatType?: AdFormatType;
  /** Optional: override tone */
  tone?: AdTone;
  /** Firm name for branding */
  firmName?: string;
  phoneNumber?: string;
  locality?: string;
}

/**
 * Generate a complete ad plan using the LLM.
 * The LLM decides: format, clip structure, scene content, voice, narration script.
 */
export async function generateAdPlan(req: PlanRequest): Promise<AdPlan> {
  const platformConfig = PLATFORM_CONFIGS[req.platform];

  // Determine candidate formats
  const matrixFormats = FORMAT_SELECTION_MATRIX[req.platform][req.audienceTemp];
  const candidateFormats = req.formatType
    ? [req.formatType]
    : matrixFormats.length > 0
    ? matrixFormats
    : ['hook', 'problem_solution'] as AdFormatType[];

  // Fetch voice catalog for LLM
  const voiceCatalog = await getVoiceCatalogForLLM();

  // Build context for scene library
  const sceneLibraryContext = buildSceneLibraryContext(req.caseType);

  // Build the system prompt
  const systemPrompt = buildSystemPrompt();

  // Build the user prompt
  const userPrompt = buildUserPrompt({
    caseType: req.caseType,
    platform: req.platform,
    audienceTemp: req.audienceTemp,
    candidateFormats,
    platformConfig,
    voiceCatalog,
    sceneLibraryContext,
    firmName: req.firmName,
    phoneNumber: req.phoneNumber,
    locality: req.locality,
    tone: req.tone,
  });

  // Call LLM
  const llmResponse = await callLLM(systemPrompt, [{ role: 'user', content: userPrompt }]);

  // Parse LLM response into AdPlan
  let plan: AdPlan;
  if (llmResponse) {
    plan = parseLLMResponse(llmResponse, req);
  } else {
    // Deterministic fallback when no LLM available
    plan = buildFallbackPlan(req, candidateFormats[0]);
  }

  // Resolve the voice ID (validate it exists, fallback if needed)
  if (plan.audio.source === 'elevenlabs' && plan.audio.voiceId) {
    const resolved = await resolveVoiceId(plan.audio.voiceId);
    plan.audio.voiceId = resolved.voiceId;
    plan.audio.voiceName = resolved.voiceName;
  }

  return plan;
}

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(): string {
  return `You are an expert personal injury advertising creative director, trained on the style of Thomas J. Henry and top-performing PI law firm ads on social media.

Your job is to create a complete video ad plan given a case type, platform, audience temperature, and available resources.

You output ONLY valid JSON. No markdown, no explanation, just the JSON object.

## Key Rules

1. CLIP STRUCTURE: Each clip is a single Grok video API call, max 15 seconds. Total ad ≤ 30 seconds.
   Valid clip durations: 5, 10, or 15 seconds.

2. AUDIO RULES:
   - Single clip [15]: can use "grok" (native audio) — voice is generated by Grok in the video itself
   - Multi-clip: use "elevenlabs" for narration (one continuous voice across all clips) OR "music_only"
   - UGC format with single clip [15]: can use "grok" for voice
   - UGC format with multi-clip: must use "elevenlabs" or "music_only" (text overlay carries the message)

3. UGC VISUAL RULES:
   - Medium to wide shots ONLY. Never close-up faces.
   - Person doing an activity, not looking at camera, not visibly speaking.
   - Handheld, slightly imperfect framing. The AI imperfections help sell authenticity.
   - The situation tells the story, not the face.

4. VOICE SELECTION:
   - Choose the best voice from the available ElevenLabs catalog based on format, case type, tone, and platform.
   - Consider: gender, age, accent, emotional quality.
   - Fallback: Blain (male) or Kristen (female) if unsure.

5. NARRATION SCRIPTS:
${NARRATION_STYLE_GUIDE}

6. VISUAL PROMPTS:
   - Every visual prompt must end with the realism suffix for quality.
   - For UGC format, also append the UGC style suffix.
   - Be specific about camera angle, distance, lighting, and setting.
   - Avoid any prompt that requires a close-up face or visible lip sync.

## Output JSON Schema

{
  "formatType": "hook" | "problem_solution" | "ugc" | "attorney_direct" | "demo" | "lifestyle" | "comparison" | "educational" | "offer" | "retargeting",
  "tone": "aggressive" | "empathetic" | "authoritative" | "urgent",
  "clipStructure": [15] | [5, 10] | [15, 5] | ... (valid durations summing to ≤ 30),
  "scenes": [
    {
      "clipIndex": 0,
      "duration": 5 | 10 | 15,
      "primitive": "pattern_interrupt" | "pain_point" | "authority_proof" | "social_proof" | "attorney_direct" | "educational_tip" | "comparison" | "cta" | "urgency",
      "visualPrompt": "detailed Grok video generation prompt",
      "textOverlay": "ON-SCREEN TEXT IN CAPS" | null,
      "overlayPosition": "top" | "center" | "bottom",
      "ctaText": "Call Now: (555) 123-4567" | null,
      "showLogo": true | false,
      "videoSource": "text" | "selfie",
      "transition": "cut" | "fade"
    }
  ],
  "audio": {
    "source": "grok" | "elevenlabs" | "music_only" | "silent",
    "voiceId": "eleven_labs_voice_id or name",
    "script": "Full narration script for the entire ad...",
    "musicMood": "dramatic" | "hopeful" | "urgent" | "corporate"
  }
}`;
}

// ---------------------------------------------------------------------------
// User Prompt Builder
// ---------------------------------------------------------------------------

interface UserPromptParams {
  caseType: CaseType;
  platform: Platform;
  audienceTemp: AudienceTemp;
  candidateFormats: AdFormatType[];
  platformConfig: (typeof PLATFORM_CONFIGS)[Platform];
  voiceCatalog: string;
  sceneLibraryContext: string;
  firmName?: string;
  phoneNumber?: string;
  locality?: string;
  tone?: AdTone;
}

function buildUserPrompt(params: UserPromptParams): string {
  const {
    caseType,
    platform,
    audienceTemp,
    candidateFormats,
    platformConfig,
    voiceCatalog,
    sceneLibraryContext,
    firmName,
    phoneNumber,
    locality,
    tone,
  } = params;

  const formatDescriptions = candidateFormats
    .map((f) => {
      const recipe = getFormatRecipe(f);
      return recipe ? `- ${f}: ${recipe.description}` : `- ${f}`;
    })
    .join('\n');

  const validStructures = CLIP_STRUCTURES
    .filter(
      (s) =>
        s.total >= platformConfig.sweetSpot.min &&
        s.total <= platformConfig.sweetSpot.max + 10
    )
    .map((s) => `[${s.clips.join(', ')}] = ${s.total}s`)
    .join('\n  ');

  return `Create a video ad plan for a personal injury law firm.

## Inputs

Case type: ${caseType}
Platform: ${platform}
Audience temperature: ${audienceTemp}
${tone ? `Requested tone: ${tone}` : 'Tone: choose the best fit'}
${firmName ? `Firm name: ${firmName}` : ''}
${phoneNumber ? `Phone number: ${phoneNumber}` : 'Phone number: (555) 123-4567'}
${locality ? `Location: ${locality}` : ''}

## Platform: ${platform}
- Sweet spot: ${platformConfig.sweetSpot.min}–${platformConfig.sweetSpot.max} seconds
- Overlay density: ${platformConfig.overlayDensity}
- CTA style: ${platformConfig.ctaStyle}

## Candidate Formats (pick one)
${formatDescriptions}

## Valid Clip Structures (within platform sweet spot)
  ${validStructures}

## Available Voices
${voiceCatalog}

## Scene Library (use these as inspiration, adapt freely)
${sceneLibraryContext}

Generate the complete ad plan as JSON. Pick the best format, structure, voice, and write original visual prompts and narration.`;
}

// ---------------------------------------------------------------------------
// Scene Library Context Builder
// ---------------------------------------------------------------------------

function buildSceneLibraryContext(caseType: CaseType): string {
  const sections: string[] = [];

  const painVisuals = PAIN_VISUALS[caseType];
  if (painVisuals) {
    sections.push(`Pain/Problem visuals:\n${painVisuals.slice(0, 2).map((v) => `  - ${v}`).join('\n')}`);
  }

  const reliefVisuals = RELIEF_VISUALS[caseType];
  if (reliefVisuals) {
    sections.push(`Relief/After visuals:\n${reliefVisuals.slice(0, 2).map((v) => `  - ${v}`).join('\n')}`);
  }

  sections.push(`Authority visuals:\n${AUTHORITY_VISUALS.slice(0, 2).map((v) => `  - ${v}`).join('\n')}`);

  const eduVisuals = EDUCATIONAL_VISUALS[caseType];
  if (eduVisuals) {
    sections.push(`Educational visuals:\n${eduVisuals.slice(0, 2).map((v) => `  - ${v}`).join('\n')}`);
  }

  const interrupts = PATTERN_INTERRUPT_VISUALS[caseType];
  if (interrupts) {
    sections.push(`Pattern interrupt visuals:\n${interrupts.slice(0, 2).map((v) => `  - ${v}`).join('\n')}`);
  }

  // Sample overlay text
  const overlayExamples: string[] = [];
  for (const primitive of ['pattern_interrupt', 'pain_point', 'cta'] as const) {
    const overlays = OVERLAY_TEMPLATES[primitive]?.[caseType];
    if (overlays?.[0]) {
      overlayExamples.push(`  ${primitive}: "${overlays[0]}"`);
    }
  }
  if (overlayExamples.length > 0) {
    sections.push(`Sample overlay text:\n${overlayExamples.join('\n')}`);
  }

  // Narration examples
  const socialProof = OVERLAY_TEMPLATES.social_proof?.[caseType];
  if (socialProof?.[0]) {
    sections.push(`Sample testimonial narration: "${socialProof[0]}"`);
  }

  return sections.join('\n\n');
}

// ---------------------------------------------------------------------------
// LLM Response Parser
// ---------------------------------------------------------------------------

function parseLLMResponse(raw: string, req: PlanRequest): AdPlan {
  // Extract JSON from response (handle potential markdown wrapping)
  let jsonStr = raw.trim();
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error('[planner] Failed to parse LLM JSON, using fallback');
    console.error('[planner] Raw response:', raw.slice(0, 500));
    return buildFallbackPlan(req, 'problem_solution');
  }

  // Validate and construct AdPlan
  const clipStructure: ClipDuration[] = Array.isArray(parsed.clipStructure)
    ? parsed.clipStructure.map((d: number) => {
        if (d === 5 || d === 10 || d === 15) return d;
        return d <= 7 ? 5 : d <= 12 ? 10 : 15;
      })
    : [15];

  const totalDuration = clipStructure.reduce((a: number, b: number) => a + b, 0);
  if (totalDuration > 30) {
    console.warn(`[planner] LLM returned ${totalDuration}s total, clamping to valid structure`);
    return buildFallbackPlan(req, parsed.formatType || 'problem_solution');
  }

  const scenes: ScenePlan[] = (parsed.scenes ?? []).map((s: any, i: number) => ({
    clipIndex: i,
    duration: clipStructure[i] || 15,
    primitive: s.primitive || 'pain_point',
    visualPrompt: appendSuffixes(s.visualPrompt || '', parsed.formatType),
    textOverlay: s.textOverlay || undefined,
    overlayPosition: s.overlayPosition || 'center',
    ctaText: s.ctaText || undefined,
    showLogo: s.showLogo ?? (i === (parsed.scenes?.length ?? 1) - 1),
    videoSource: s.videoSource || 'text',
    transition: s.transition || 'cut',
  }));

  const audio = parsed.audio ?? {};

  return {
    id: uuid(),
    formatType: parsed.formatType || 'problem_solution',
    caseType: req.caseType,
    platform: req.platform,
    audienceTemp: req.audienceTemp,
    tone: parsed.tone || req.tone || 'empathetic',
    clipStructure,
    totalDuration,
    scenes,
    audio: {
      source: validateAudioSource(audio.source, clipStructure),
      voiceId: audio.voiceId || undefined,
      voiceName: audio.voiceName || undefined,
      script: audio.script || undefined,
      musicMood: audio.musicMood || 'dramatic',
    },
    disclaimer: 'Prior results do not guarantee a similar outcome. Free consultation.',
    firmName: req.firmName,
    phoneNumber: req.phoneNumber || '(555) 123-4567',
    locality: req.locality,
  };
}

function validateAudioSource(source: string | undefined, clips: ClipDuration[]): AudioSource {
  const isMultiClip = clips.length > 1;
  if (source === 'grok' && isMultiClip) return 'elevenlabs';
  if (source === 'grok' || source === 'elevenlabs' || source === 'music_only' || source === 'silent') {
    return source;
  }
  return isMultiClip ? 'elevenlabs' : 'grok';
}

function appendSuffixes(prompt: string, formatType: string): string {
  let result = prompt;
  if (!result.includes('Render as live-action')) {
    result = `${result} ${REALISM_SUFFIX}`;
  }
  if (formatType === 'ugc' && !result.includes('medium-wide')) {
    result = `${result} ${UGC_STYLE_SUFFIX}`;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Deterministic Fallback (no LLM available)
// ---------------------------------------------------------------------------

function buildFallbackPlan(req: PlanRequest, formatType: AdFormatType): AdPlan {
  const recipe = getFormatRecipe(formatType) || FORMAT_RECIPES[0];
  const platformConfig = PLATFORM_CONFIGS[req.platform];

  // Pick first preferred structure that fits
  const structure = recipe.preferredStructures[0] || [15];
  const clipStructure = structure as ClipDuration[];
  const totalDuration = clipStructure.reduce((a, b) => a + b, 0);

  // Pick the first sequence
  const sequence = recipe.sequences[0];

  // Build scenes from the scene library
  const scenes: ScenePlan[] = clipStructure.map((duration, i) => {
    const primitive = sequence[i] || 'cta';
    const visuals = getDefaultVisual(primitive, req.caseType);
    const overlays = OVERLAY_TEMPLATES[primitive]?.[req.caseType];

    return {
      clipIndex: i,
      duration,
      primitive,
      visualPrompt: appendSuffixes(visuals, formatType),
      textOverlay: overlays?.[0],
      overlayPosition: (i === clipStructure.length - 1 ? 'center' : 'center') as 'top' | 'center' | 'bottom',
      ctaText: primitive === 'cta'
        ? `Free Case Review — Call ${req.phoneNumber || '(555) 123-4567'}`
        : undefined,
      showLogo: i === clipStructure.length - 1,
      videoSource: 'text' as const,
      transition: 'cut' as const,
    };
  });

  // Determine audio
  const isMultiClip = clipStructure.length > 1;
  const audioSource: AudioSource = isMultiClip ? 'elevenlabs' : 'grok';

  // Build a basic narration script
  const narrationParts = scenes
    .map((s) => s.textOverlay)
    .filter(Boolean);
  narrationParts.push(`Free consultation. No fee unless we win. Call ${req.phoneNumber || 'now'}.`);

  return {
    id: uuid(),
    formatType,
    caseType: req.caseType,
    platform: req.platform,
    audienceTemp: req.audienceTemp,
    tone: req.tone || 'empathetic',
    clipStructure,
    totalDuration,
    scenes,
    audio: {
      source: audioSource,
      voiceId: audioSource === 'elevenlabs' ? 'kristen' : undefined,
      script: audioSource === 'elevenlabs' ? narrationParts.join(' ') : undefined,
      musicMood: 'dramatic',
    },
    disclaimer: 'Prior results do not guarantee a similar outcome. Free consultation.',
    firmName: req.firmName,
    phoneNumber: req.phoneNumber || '(555) 123-4567',
    locality: req.locality,
  };
}

function getDefaultVisual(primitive: string, caseType: CaseType): string {
  switch (primitive) {
    case 'pattern_interrupt':
      return PATTERN_INTERRUPT_VISUALS[caseType]?.[0] || 'Dramatic opening shot, cinematic lighting';
    case 'pain_point':
      return PAIN_VISUALS[caseType]?.[0] || 'Person in distress after an injury, medium-wide shot';
    case 'authority_proof':
      return AUTHORITY_VISUALS[0];
    case 'social_proof':
      return RELIEF_VISUALS[caseType]?.[0] || 'Person looking relieved and hopeful, medium-wide shot';
    case 'attorney_direct':
      return AUTHORITY_VISUALS[0];
    case 'educational_tip':
      return EDUCATIONAL_VISUALS[caseType]?.[0] || 'Informational scene with clean visuals';
    case 'comparison':
      return COMPARISON_VISUALS[caseType]?.[0]?.withAttorney || AUTHORITY_VISUALS[1];
    case 'cta':
      return CTA_VISUALS[0];
    case 'urgency':
      return PATTERN_INTERRUPT_VISUALS[caseType]?.[1] || 'Urgent visual, clock ticking, dramatic lighting';
    default:
      return PAIN_VISUALS[caseType]?.[0] || 'Cinematic shot related to personal injury';
  }
}

// ---------------------------------------------------------------------------
// Batch Plan Generation
// ---------------------------------------------------------------------------

/**
 * Generate multiple ad plans for a case type across platforms.
 * Useful for creating a full campaign batch.
 */
export async function generateCampaignBatch(
  caseType: CaseType,
  opts: {
    firmName?: string;
    phoneNumber?: string;
    locality?: string;
    platforms?: Platform[];
    audienceTemps?: AudienceTemp[];
  } = {}
): Promise<AdPlan[]> {
  const platforms = opts.platforms || ['tiktok', 'instagram', 'facebook'];
  const temps = opts.audienceTemps || ['cold', 'warm'];

  const requests: PlanRequest[] = [];
  for (const platform of platforms) {
    for (const audienceTemp of temps) {
      // Skip combos with no formats
      const formats = FORMAT_SELECTION_MATRIX[platform][audienceTemp];
      if (formats.length === 0) continue;

      requests.push({
        caseType,
        platform,
        audienceTemp,
        firmName: opts.firmName,
        phoneNumber: opts.phoneNumber,
        locality: opts.locality,
      });
    }
  }

  // Generate plans in parallel (up to 5 concurrent)
  const results: AdPlan[] = [];
  const batchSize = 5;
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((r) => generateAdPlan(r)));
    results.push(...batchResults);
  }

  return results;
}
