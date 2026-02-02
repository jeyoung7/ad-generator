import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import type { ElevenLabsVoice } from './templates/types.js';
import { FALLBACK_VOICES } from './templates/types.js';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE_URL = 'https://api.elevenlabs.io/v1';

if (!API_KEY) {
  console.warn('WARNING: ELEVENLABS_API_KEY not set in environment');
}

// ---------------------------------------------------------------------------
// Voice Catalog
// ---------------------------------------------------------------------------

/** Cached voice list — refreshed once per server lifetime or on demand */
let cachedVoices: ElevenLabsVoice[] | null = null;

/**
 * Fetch all available voices from ElevenLabs account.
 * Includes library voices and any custom clones.
 */
export async function fetchVoices(forceRefresh = false): Promise<ElevenLabsVoice[]> {
  if (cachedVoices && !forceRefresh) return cachedVoices;

  console.log('[elevenlabs] Fetching voice catalog...');

  const res = await fetch(`${BASE_URL}/voices`, {
    headers: { 'xi-api-key': API_KEY! },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[elevenlabs] Failed to fetch voices (${res.status}): ${errText}`);
    return cachedVoices ?? [];
  }

  const data = await res.json();
  const voices: ElevenLabsVoice[] = (data.voices ?? []).map((v: any) => ({
    voice_id: v.voice_id,
    name: v.name,
    labels: v.labels ?? {},
    preview_url: v.preview_url ?? undefined,
  }));

  cachedVoices = voices;
  console.log(`[elevenlabs] Loaded ${voices.length} voices`);
  return voices;
}

/**
 * Format voice list as a compact string for LLM context.
 * Includes voice ID, name, and key labels (gender, accent, age, use case).
 */
export async function getVoiceCatalogForLLM(): Promise<string> {
  const voices = await fetchVoices();
  if (voices.length === 0) {
    return 'No ElevenLabs voices available. Use fallback: Blain (male) or Kristen (female).';
  }

  const lines = voices.map((v) => {
    const labels = v.labels
      ? Object.entries(v.labels)
          .map(([k, val]) => `${k}: ${val}`)
          .join(', ')
      : '';
    return `- ${v.voice_id}: "${v.name}" ${labels ? `(${labels})` : ''}`;
  });

  return [
    'Available ElevenLabs voices:',
    ...lines,
    '',
    `Fallback male: "${FALLBACK_VOICES.male.name}" (${FALLBACK_VOICES.male.voiceId})`,
    `Fallback female: "${FALLBACK_VOICES.female.name}" (${FALLBACK_VOICES.female.voiceId})`,
  ].join('\n');
}

/**
 * Resolve a voice ID — if the requested voice isn't found, fall back
 * to Blain (male) or Kristen (female).
 */
export async function resolveVoiceId(
  requestedId: string | undefined,
  fallbackGender: 'male' | 'female' = 'female'
): Promise<{ voiceId: string; voiceName: string }> {
  if (!requestedId) {
    const fb = FALLBACK_VOICES[fallbackGender];
    return { voiceId: fb.voiceId, voiceName: fb.name };
  }

  const voices = await fetchVoices();
  const match = voices.find(
    (v) =>
      v.voice_id === requestedId ||
      v.name.toLowerCase() === requestedId.toLowerCase()
  );

  if (match) {
    return { voiceId: match.voice_id, voiceName: match.name };
  }

  console.warn(
    `[elevenlabs] Voice "${requestedId}" not found, using fallback ${fallbackGender}`
  );
  const fb = FALLBACK_VOICES[fallbackGender];
  return { voiceId: fb.voiceId, voiceName: fb.name };
}

// ---------------------------------------------------------------------------
// Text-to-Speech (TTS) Narration
// ---------------------------------------------------------------------------

export interface TTSOptions {
  /** The narration script text */
  script: string;
  /** ElevenLabs voice ID */
  voiceId: string;
  /** Output directory for the generated audio file */
  outputDir: string;
  /** Model ID — defaults to eleven_multilingual_v2 */
  modelId?: string;
  /** Stability (0-1). Lower = more natural variation. Default 0.4 */
  stability?: number;
  /** Similarity boost (0-1). Default 0.7 */
  similarityBoost?: number;
  /** Style (0-1). Higher = more expressive. Default 0.6 */
  style?: number;
  /** Use speaker boost for cleaner output. Default true */
  useSpeakerBoost?: boolean;
}

/**
 * Generate narration audio using ElevenLabs TTS API.
 * Returns the path to the generated MP3 file.
 */
export async function generateNarration(opts: TTSOptions): Promise<string> {
  const {
    script,
    voiceId,
    outputDir,
    modelId = 'eleven_multilingual_v2',
    stability = 0.4,
    similarityBoost = 0.7,
    style = 0.6,
    useSpeakerBoost = true,
  } = opts;

  console.log(
    `[elevenlabs] Generating TTS narration with voice "${voiceId}": "${script.slice(0, 80)}..."`
  );

  const res = await fetch(
    `${BASE_URL}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: script,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: useSpeakerBoost,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs TTS error (${res.status}): ${errText}`);
  }

  const filename = `narration_${uuid()}.mp3`;
  const filePath = path.join(outputDir, filename);
  const arrBuf = await res.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrBuf));

  console.log(`[elevenlabs] Narration saved: ${filePath}`);
  return filePath;
}

// ---------------------------------------------------------------------------
// Music Generation (existing)
// ---------------------------------------------------------------------------

/**
 * Generate background music for a video ad using ElevenLabs Music API.
 * Returns the path to the generated audio file.
 */
export async function generateMusic(
  prompt: string,
  durationMs: number,
  outputDir: string
): Promise<string> {
  console.log(
    `[elevenlabs] Generating music: "${prompt.slice(0, 60)}..." (${durationMs}ms)`
  );

  const res = await fetch(`${BASE_URL}/music`, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: durationMs,
      model_id: 'music_v1',
      force_instrumental: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs music error (${res.status}): ${errText}`);
  }

  const filename = `music_${uuid()}.mp3`;
  const filePath = path.join(outputDir, filename);
  const arrBuf = await res.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrBuf));

  console.log(`[elevenlabs] Music saved: ${filePath}`);
  return filePath;
}

/**
 * Generate a sound effect using ElevenLabs Sound Effects API.
 * Returns the path to the generated audio file.
 */
export async function generateSoundEffect(
  text: string,
  durationSeconds: number,
  outputDir: string
): Promise<string> {
  console.log(
    `[elevenlabs] Generating SFX: "${text.slice(0, 60)}..." (${durationSeconds}s)`
  );

  const res = await fetch(
    `${BASE_URL}/sound-generation?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        duration_seconds: durationSeconds,
        prompt_influence: 0.3,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs SFX error (${res.status}): ${errText}`);
  }

  const filename = `sfx_${uuid()}.mp3`;
  const filePath = path.join(outputDir, filename);
  const arrBuf = await res.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrBuf));

  console.log(`[elevenlabs] SFX saved: ${filePath}`);
  return filePath;
}

/** Pre-built music prompts per ad mood */
export const MUSIC_PROMPTS: Record<string, string> = {
  dramatic:
    'Dark cinematic background music, tension building, deep bass, minor key, slow tempo, dramatic orchestral underscore for a legal advertisement. No vocals.',
  hopeful:
    'Uplifting hopeful background music, warm piano and soft strings, major key, gentle rising melody, inspirational underscore for a legal advertisement. No vocals.',
  urgent:
    'Urgent fast-paced background music, driving percussion, tense strings, building intensity, news-style underscore for a legal advertisement. No vocals.',
  corporate:
    'Professional corporate background music, clean and modern, subtle electronic elements with acoustic guitar, confident and trustworthy underscore for a legal advertisement. No vocals.',
};
