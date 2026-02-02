import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE_URL = 'https://api.elevenlabs.io/v1';

if (!API_KEY) {
  console.warn('WARNING: ELEVENLABS_API_KEY not set in environment');
}

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
