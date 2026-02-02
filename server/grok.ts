import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

const BASE_URL = 'https://api.x.ai/v1';
const API_KEY = process.env.XAI_API_KEY;
const MODEL = 'grok-imagine-video';
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 120; // 10 minutes max

if (!API_KEY) {
  console.warn('WARNING: XAI_API_KEY not set in environment');
}

interface VideoResult {
  filePath: string;
  url: string;
}

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  };
}

/**
 * Poll for video result until it's ready or fails.
 */
async function pollForResult(requestId: string): Promise<{ url: string; duration: number }> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const res = await fetch(`${BASE_URL}/videos/${requestId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      // 404 or similar might mean still processing on some APIs
      if (res.status === 404 || res.status === 202) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      throw new Error(`Poll error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const video = data.video;
    console.log(`[grok] Poll attempt ${i + 1}/${MAX_POLL_ATTEMPTS}, status: ${data.status ?? 'unknown'}, has url: ${!!video?.url}`);

    if (video?.url) {
      return { url: video.url, duration: video.duration };
    }

    // If there's a status field indicating failure
    if (data.status === 'failed' || data.error) {
      throw new Error(`Video generation failed: ${data.error || 'unknown'}`);
    }

    // Still processing
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error('Video generation timed out');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Download a video from a URL to a local file.
 */
async function downloadVideo(videoUrl: string, outputDir: string): Promise<VideoResult> {
  const filename = `${uuid()}.mp4`;
  const filePath = path.join(outputDir, filename);

  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`Failed to download video: ${res.status}`);

  const arrBuf = await res.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrBuf));

  return { filePath, url: `/output/${filename}` };
}

/**
 * Generate video from a text prompt via Grok Imagine Video API.
 */
export async function generateVideo(
  opts: {
    prompt: string;
    duration?: number;
    aspectRatio?: string;
    resolution?: string;
  },
  outputDir: string
): Promise<VideoResult> {
  const body: Record<string, unknown> = {
    model: MODEL,
    prompt: opts.prompt,
  };
  if (opts.duration) body.duration = opts.duration;
  if (opts.aspectRatio) body.aspect_ratio = opts.aspectRatio;
  if (opts.resolution) body.resolution = opts.resolution;

  console.log(`[grok] Generating video from text: "${opts.prompt.slice(0, 60)}..."`);
  console.log(`[grok] Request body:`, JSON.stringify(body, null, 2));

  const res = await fetch(`${BASE_URL}/videos/generations`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[grok] Error response (${res.status}):`, errText);
    throw new Error(`Grok generation error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  console.log(`[grok] Response:`, JSON.stringify(data, null, 2));
  const { request_id } = data as { request_id: string };
  console.log(`[grok] Request ID: ${request_id}, polling for result...`);

  const result = await pollForResult(request_id);
  console.log(`[grok] Video ready: ${result.url}`);

  return downloadVideo(result.url, outputDir);
}

/**
 * Generate video from a selfie/image via Grok Imagine Video API (image→video).
 * The imageUrl must be a publicly accessible URL.
 * For local files, the server needs to serve them first.
 */
export async function generateFromImage(
  opts: {
    prompt: string;
    imageUrl: string;
    imageUrls?: string[];
    duration?: number;
    aspectRatio?: string;
    resolution?: string;
  },
  outputDir: string
): Promise<VideoResult> {
  const baseBody: Record<string, unknown> = {
    model: MODEL,
    prompt: opts.prompt,
  };
  if (opts.duration) baseBody.duration = opts.duration;
  if (opts.aspectRatio) baseBody.aspect_ratio = opts.aspectRatio;
  if (opts.resolution) baseBody.resolution = opts.resolution;

  const cleanedImageUrls = (opts.imageUrls || [])
    .map((url) => url.trim())
    .filter(Boolean);
  const hasMultiReference = cleanedImageUrls.length > 1;

  console.log(`[grok] Generating video from image: "${opts.prompt.slice(0, 60)}..."`);
  console.log(
    `[grok] Reference images: ${hasMultiReference ? cleanedImageUrls.length : 1}`
  );

  async function postGeneration(body: Record<string, unknown>) {
    return fetch(`${BASE_URL}/videos/generations`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
  }

  // Try multi-reference format first when multiple images are available.
  let body: Record<string, unknown>;
  let res: Response;
  if (hasMultiReference) {
    body = {
      ...baseBody,
      image: { url: opts.imageUrl },
      images: cleanedImageUrls.map((url) => ({ url })),
    };
    console.log(`[grok] Request body (multi-image):`, JSON.stringify(body, null, 2));
    res = await postGeneration(body);

    if (!res.ok && (res.status === 400 || res.status === 422)) {
      const errText = await res.text();
      console.warn(
        `[grok] Multi-image payload rejected (${res.status}), retrying with single image: ${errText}`
      );
      body = { ...baseBody, image: { url: opts.imageUrl } };
      console.log(`[grok] Request body (single image fallback):`, JSON.stringify(body, null, 2));
      res = await postGeneration(body);
    }
  } else {
    body = { ...baseBody, image: { url: opts.imageUrl } };
    console.log(`[grok] Request body:`, JSON.stringify(body, null, 2));
    res = await postGeneration(body);
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[grok] Error response (${res.status}):`, errText);
    throw new Error(`Grok image→video error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  console.log(`[grok] Response:`, JSON.stringify(data, null, 2));
  const { request_id } = data as { request_id: string };
  console.log(`[grok] Request ID: ${request_id}, polling for result...`);

  const result = await pollForResult(request_id);
  console.log(`[grok] Video ready: ${result.url}`);

  return downloadVideo(result.url, outputDir);
}

/**
 * Edit an existing video via Grok Imagine Video API.
 * The videoUrl must be a publicly accessible URL (max 8.7s input).
 */
export async function editVideo(
  opts: {
    prompt: string;
    videoUrl: string;
    aspectRatio?: string;
    resolution?: string;
  },
  outputDir: string
): Promise<VideoResult> {
  const body: Record<string, unknown> = {
    model: MODEL,
    prompt: opts.prompt,
    video: { url: opts.videoUrl },
  };
  if (opts.aspectRatio) body.aspect_ratio = opts.aspectRatio;
  if (opts.resolution) body.resolution = opts.resolution;

  console.log(`[grok] Editing video: "${opts.prompt.slice(0, 60)}..."`);

  const res = await fetch(`${BASE_URL}/videos/edits`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Grok video edit error (${res.status}): ${errText}`);
  }

  const { request_id } = (await res.json()) as { request_id: string };
  console.log(`[grok] Request ID: ${request_id}, polling for result...`);

  const result = await pollForResult(request_id);
  console.log(`[grok] Edited video ready: ${result.url}`);

  return downloadVideo(result.url, outputDir);
}
