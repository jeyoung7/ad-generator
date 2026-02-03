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
  BRAND_VISUALS,
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
  const sceneLibraryContext = buildSceneLibraryContext(req.caseType, req.locality);

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
   - The UGC format shows a RELATABLE PERSON living their life while a VOICEOVER narrates their story and recommendation of the firm.
   - The person is NOT looking at camera and NOT speaking. They are doing everyday activities: walking, driving, sitting at a coffee shop, picking up kids, going to work, etc.
   - Medium-wide or waist-up framing. Handheld phone footage style, like a friend filmed this.
   - Background MUST be a recognizable REAL location from the firm's city/locality (local coffee shop, familiar parking lot, well-known local park, neighborhood street, suburban shopping strip). This grounds the ad in the community.
   - The voiceover is the person's voice telling their story — what happened to them and why this firm is the best. The visual is just them living their recovered life.
   - Handheld, slightly imperfect framing. Natural lighting. No studio. The person should look like someone from that community — relatable, everyday, not a model.

4. UGC MESSAGING RULES (IMPORTANT):
   - The narrator is a REAL PERSON who used this firm and genuinely loves them. They are telling their story and recommending the firm.
   - The vibe is: "Let me tell you about these people" — enthusiastic, grateful, authentic.
   - They should mention WHY the firm is the best: how they were treated, how the firm fought for them, how easy the process was, the result they got.
   - Can include their personal story briefly (what happened to them) but the focus is on the FIRM and why they recommend them.
   - Sound like a real review, not a scripted testimonial. Use the person's natural voice and rhythm.
   - NEVER attribute a specific dollar amount to an individual client's case (e.g. "they got me $250K") unless that figure was explicitly provided in the brief. You CAN say the firm has recovered millions/billions for clients in general, or that the firm is the best. Individual testimonials should describe the outcome without a specific number (e.g. "they got me way more than insurance ever offered", "they fought for every penny I deserved").
   - Do NOT sound like a commercial. No announcer cadence. No "Have you or a loved one..." energy.

5. VOICE SELECTION:
   - Choose the best voice from the available ElevenLabs catalog based on format, case type, tone, platform, AND LOCALITY.
   - The voice should sound like someone FROM that city/region. If the firm is in Houston, pick a voice that sounds like a Texan. Miami = someone who could be from South Florida. NYC = fast-talking, direct.
   - For UGC: pick a voice that sounds like a regular person from that area — not a voiceover artist, not an announcer. Someone you'd meet at the grocery store.
   - For attorney_direct: pick a confident, authoritative voice that still sounds regionally appropriate.
   - Consider: gender, age, accent, regional warmth, emotional quality.
   - Fallback: Blain (male) or Kristen (female) if unsure.

6. NARRATION SCRIPTS:
${NARRATION_STYLE_GUIDE}

7. VISUAL PROMPTS:
   - Every visual prompt must end with the realism suffix for quality.
   - For UGC format, also append the UGC style suffix.
   - Be specific about camera angle, distance, lighting, and setting.
   - LOCALITY IN VISUALS (CRITICAL): If a locality/city is provided, weave recognizable local elements into the visual prompts so viewers instantly know this ad is for THEIR city:
     * Include iconic landmarks, well-known streets/neighborhoods, or recognizable local storefronts/intersections in backgrounds.
     * Never use fictional skylines or generic made-up cityscapes.
     * Use location-appropriate weather, vegetation, architecture, and vibe (e.g., palm trees for Miami, brownstones for Boston, highways for Houston, desert for Phoenix).
     * For UGC scenes: the person should be in a location that screams that city — a local park, a recognizable intersection, a neighborhood coffee shop with city signage visible.
     * For non-UGC scenes: incorporate the city's visual identity into cinematic shots (e.g., accident scene on a recognizable local highway, courthouse that looks like the local one, street-level neighborhood detail in relief scenes).
   - For non-UGC formats: avoid close-up faces or visible lip sync on non-attorney characters.

8. HUMAN PRESENCE POLICY (IMPORTANT):
   - For NON-UGC formats: Default to NO identifiable individual people in scenes. Only show a clear person when that person is explicitly the attorney. Use silhouettes, hands, over-the-shoulder, or distant/group framing for others.
   - For UGC format: Show a relatable everyday person doing activities (NOT looking at camera, NOT speaking). The voiceover tells the story. Frame them medium-wide or waist-up. They should look like a normal person from the firm's city, not a model or actor.
   - Prioritize environment/object/story visuals over faces in non-UGC to avoid AI uncanny artifacts.

9. CREATIVE PUNCH / CINEMATIC FEEL:
   - Build a scroll-stopping first 1-2 seconds (visual shock, contrast, or sudden movement).
   - Keep overlays punchy and short (ideally <= 6 words when possible).
   - Write overlay copy in bold, high-contrast language that can be read in under 1 second.
   - Aim for premium cinematic language: contrast lighting, purposeful camera movement, textured atmosphere.
   - Make each scene feel attention-grabbing and platform-native for Instagram/TikTok.

10. CREATIVE VARIATION:
   - Avoid repetitive framing across scenes.
   - Mix shot types (macro, wide, overhead, low-angle, tracking, static hold) while staying coherent.
   - Prefer one strong visual motif per ad and carry it consistently.
   - Maintain continuity between scenes: same visual world, believable progression, consistent lighting/time-of-day, and recurring location cues so clips feel like one story.

11. AUDIO ↔ OVERLAY SYNCHRONIZATION (TRANSCRIPT MODE):
   - The narration script is the TRANSCRIPT. The on-screen text overlay is the VISUAL TRANSCRIPT — it shows the exact words being spoken, highlighted in real time.
   - Each scene's textOverlay MUST be the key phrase extracted directly from the narration for that scene's time window. Not a summary. Not a different line. The actual spoken words (or a punchy 3-6 word excerpt).
   - The viewer should be able to read the overlay and hear the voice saying those same words at the same time. This creates a TikTok-style word-by-word caption feel.
   - Narration should feel like it is reading/emphasizing what appears on screen, not saying unrelated lines.
   - Avoid long spoken tangents that are not represented in overlays.

12. PER-SCENE SCRIPT TIMING:
   - The full narration script must be paced to fill the ENTIRE ad duration with continuous speech. No dead air.
   - For each scene, include a "sceneScript" field: the exact portion of the narration that plays during THAT scene's time window.
   - Word count per scene: ~2.6-2.9 words per second × scene duration. A 5s scene = ~14 words. A 10s scene = ~27 words. A 15s scene = ~41 words.
   - The concatenation of all sceneScript fields must equal the full audio.script.

13. TONE OSCILLATION IN VOICE:
   - The narration must NOT be delivered at one flat energy level. The voice rises and falls to match content.
   - MAIN POINT (the key message of the ad): Biggest energy. Slower, louder, more deliberate. The narrator leans in.
   - Setup/context: Normal conversational pace and volume.
   - Pain/problem: Lower energy, more serious, grounded weight.
   - Relief/gratitude: Warm genuine lift. Like exhaling.
   - CTA: Casual, direct, friendly nudge. NOT shouty.
   - Include a "toneDirection" field per scene: a short phrase telling the voice actor how to deliver that scene (e.g., "serious and grounded", "BIG energy — this is the key line", "warm relief", "casual friendly nudge").

14. CTA PLACEMENT:
   - "Tap the link", "call them", "link in bio", phone number — these ONLY appear in the FINAL scene.
   - NEVER front-load or mid-roll the CTA. The story earns the right to ask. Build the case, then nudge.
   - The CTA should feel like a natural ending to the story, not a hard pivot.

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
      "textOverlay": "KEY SPOKEN WORDS IN CAPS (3-6 word excerpt from sceneScript)" | null,
      "overlayPosition": "top" | "center" | "bottom",
      "sceneScript": "The exact narration spoken during this scene's time window. Word count must match ~2.5 words/sec × duration.",
      "toneDirection": "How to deliver this scene's voice (e.g. 'serious and grounded', 'BIG energy — key line', 'warm relief', 'casual nudge')",
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

function buildFirmIntroGuidance(params: {
  firmName?: string;
  audienceTemp: AudienceTemp;
  tone?: AdTone;
  locality?: string;
}): string {
  const { firmName, audienceTemp, tone, locality } = params;
  if (!firmName) return '';

  const audienceStrategy =
    audienceTemp === 'cold'
      ? 'Cold audience: earn attention first, then introduce the firm through proof, context, or authority.'
      : audienceTemp === 'warm'
      ? 'Warm audience: acknowledge familiarity and position the firm as a trusted next step.'
      : 'Hot audience: keep it direct and action-oriented; introduce the firm quickly and move to outcome/CTA.';

  const toneStrategy =
    tone === 'aggressive'
      ? 'Tone alignment: bold, competitive, high-urgency language.'
      : tone === 'authoritative'
      ? 'Tone alignment: calm confidence, legal clarity, and clear authority.'
      : tone === 'urgent'
      ? 'Tone alignment: time-sensitive, decisive, and high-stakes.'
      : 'Tone alignment: empathetic, human, and reassuring without sounding soft.';

  const localityTag = locality ? ` ${locality}` : '';

  return `## Firm Introduction Guidance
- The firm mention must feel organic, not templated.
- Avoid repetitive openers like "At ${firmName}" in every variation.
- Mention ${firmName} 1-2 times in short ads; save one mention for the CTA beat.
- Choose one intro angle that matches the audience and tone:
  - ${audienceStrategy}
  - ${toneStrategy}
- Prefer intros like these (adapt, do not copy verbatim):
  - "So I got hit on ${locality ? `[a well-known local road/highway in ${locality}]` : 'the highway'} and didn't know what to do. My cousin told me to call ${firmName}. Best call I ever made."
  - "If you're in${localityTag} and you get hurt, you call ${firmName}. That's just what you do around here."
  - "I'm not the type to sue anybody. But ${firmName} made it easy. They handled everything."
  - "${firmName} is different. They actually pick up the phone. They actually fight."
  - "After my accident${localityTag ? ` here in${localityTag}` : ''}, everyone told me to call ${firmName}. Now I tell everyone the same thing."`;
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

  const firmIntroGuidance = buildFirmIntroGuidance({
    firmName,
    audienceTemp,
    tone,
    locality,
  });

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
${firmIntroGuidance ? `\n\n${firmIntroGuidance}` : ''}

Generate the complete ad plan as JSON. Pick the best format, structure, voice, and write original visual prompts and narration.

KEY PRIORITIES:
1. NATURAL SCRIPTS: Write narration that sounds like a real person talking, not like a commercial. For UGC, it should sound like someone making a TikTok recommendation. For other formats, conversational and punchy — never stiff or corporate.
2. LOCAL IMAGERY: ${locality ? `This ad is for ${locality}. EVERY visual prompt should incorporate recognizable street-level elements from ${locality} — landmarks, local streets, neighborhood storefronts, architecture, vegetation, weather patterns. The viewer should instantly think "that's MY city." Avoid fictional skylines or generic made-up cityscapes. For UGC, put the person in a location that looks like ${locality}.` : 'Use generic American neighborhood/street-level visuals.'}
3. LOCAL VOICE: ${locality ? `Pick a voice that sounds like someone from ${locality}. Match the regional accent, cadence, and energy.` : 'Pick a voice that matches the tone.'}
4. For UGC format: A relatable everyday person is shown doing normal activities (walking, getting coffee, driving, picking up kids) while a VOICEOVER of that person narrates their story and recommends the firm — like telling a friend about the best lawyer they ever had. The person is NOT looking at camera and NOT speaking on screen. The voiceover carries the entire message.
5. Prioritize punchy cinematic brand-style visuals with minimal individual people unless the attorney is on-screen by intent or it's UGC format.
6. SCENE CONTINUITY: Scene-to-scene prompts should feel like one continuous mini-film, not disconnected stock shots. Keep time-of-day, weather, location character, and camera language coherent across all clips.
7. WRITING STYLE: Favor David Perell-style clarity and narrative flow (clear throughline, vivid specifics, no fluff) while keeping it natural and local.`;
}

// ---------------------------------------------------------------------------
// Scene Library Context Builder
// ---------------------------------------------------------------------------

function buildSceneLibraryContext(caseType: CaseType, locality?: string): string {
  const sections: string[] = [];

  if (locality) {
    sections.push(`LOCAL IMAGERY GUIDANCE for ${locality}:
  - Incorporate recognizable landmarks, streets, neighborhoods, and architecture from ${locality} into visual prompts.
  - Use ${locality}-appropriate weather, vegetation, terrain, and urban/suburban character.
  - For UGC: show the person doing everyday LOCAL activities — walking through a popular ${locality} neighborhood, grabbing coffee at a local spot, driving on a well-known ${locality} road, sitting in a park that feels like ${locality}, picking up kids from school with ${locality} architecture in the background. The viewer should think "that looks like my neighborhood."
  - For accident/pain scenes: reference roads, highways, intersections, or locations typical of ${locality}. Use local weather conditions (rain, snow, heat) that match the region.
  - For relief/after scenes: show the person enjoying life in ${locality}-recognizable locations — local parks, riverfronts, neighborhood streets, suburban shopping areas.
  - Include regional details: local signage, building styles, street layouts, vegetation, terrain.
  - The goal: a viewer from ${locality} should instantly recognize their city and feel "this ad is for ME."`);
  }

  const brandVisuals = BRAND_VISUALS[caseType];
  if (brandVisuals) {
    sections.push(`Brand-first cinematic visuals (no identifiable people):\n${brandVisuals.slice(0, 2).map((v) => `  - ${v}`).join('\n')}`);
  }

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
    sceneScript: s.sceneScript || undefined,
    toneDirection: s.toneDirection || undefined,
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
  if (formatType === 'ugc' && !result.includes('selfie-style')) {
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
      return BRAND_VISUALS[caseType]?.[0] || PATTERN_INTERRUPT_VISUALS[caseType]?.[0] || 'Dramatic opening shot, cinematic lighting';
    case 'pain_point':
      return BRAND_VISUALS[caseType]?.[1] || PAIN_VISUALS[caseType]?.[0] || 'Cinematic injury aftermath visual, no identifiable person';
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
      return BRAND_VISUALS[caseType]?.[0] || PAIN_VISUALS[caseType]?.[0] || 'Cinematic shot related to personal injury';
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
