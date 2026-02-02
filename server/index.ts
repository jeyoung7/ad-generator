import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { generateVideo, generateFromImage, editVideo } from './grok.js';
import {
  composeScene,
  concatClips,
  mixAudio,
  extractAudioTrack,
  getLayoutSpec,
  type VideoLayout,
} from './compose.js';
import { templates, FORMAT_RECIPES } from './templates/index.js';
import type {
  AdFormatType,
  CaseType,
  Platform,
  AudienceTemp,
  AdTone,
  AdPlan,
} from './templates/types.js';
import {
  generateMusic,
  generateNarration,
  fetchVoices,
  MUSIC_PROMPTS,
} from './elevenlabs.js';
import {
  generateNarrationTrack,
  type NarrationVoice,
} from './narration.js';
import { generateAdPlan, generateCampaignBatch } from './planner.js';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'output');
const UPLOADS_DIR = path.join(ROOT, 'uploads');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const R2_BUCKET = 'ad-generator-uploads';
const R2_PUBLIC_URL = 'https://pub-a3889d1728d544dcbe33fe8e4daa1a6c.r2.dev';

type AudioMode = 'none' | 'music' | 'narration';
type SceneOverrides = Record<number, { text?: string; cta?: string }>;

type UploadedSelfie = {
  localUrl: string;
  publicUrl: string;
  isVideo: boolean;
};

type NarrationTrackId =
  | 'narration-attorney-video'
  | 'narration-female'
  | 'narration-male';

/**
 * Upload a local file to R2 via wrangler CLI and return its public HTTPS URL.
 */
async function uploadToR2(localPath: string): Promise<string> {
  const ext = path.extname(localPath);
  const key = `${uuid()}${ext}`;
  await execFileAsync('wrangler', [
    'r2',
    'object',
    'put',
    `${R2_BUCKET}/${key}`,
    '--file',
    localPath,
  ]);
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Replace {city} and phone placeholders in template strings at generation time.
 */
function replacePlaceholders(
  text: string,
  params: { locality?: string; phoneNumber?: string }
): string {
  let result = text;
  result = result.replace(/\{city\}/g, params.locality || 'your area');
  if (params.phoneNumber) {
    result = result.replace(/\(555\) 123-4567/g, params.phoneNumber);
  }
  return result;
}

function parseLayout(layout?: string): VideoLayout {
  if (layout === 'square' || layout === 'landscape' || layout === 'portrait') {
    return layout;
  }
  return 'portrait';
}

function parseAudioMode(mode?: string): AudioMode {
  if (mode === 'none' || mode === 'music' || mode === 'narration') {
    return mode;
  }
  return 'music';
}

function isVideoFile(filePath: string): boolean {
  return /\.(mp4|mov|webm|m4v)$/i.test(filePath);
}

function normalizePublicPath(url: string): string {
  return path.join(ROOT, url.replace(/^\//, ''));
}

function buildScenePrompt(basePrompt: string, index: number, totalScenes: number): string {
  const realismSuffix =
    'Render as live-action footage with natural skin texture, realistic motion blur, practical lighting, slight handheld micro-movement, and subtle real-camera imperfections. Avoid CGI look, glossy AI artifacts, extra fingers, warped text, and surreal objects.';
  const continuitySuffix =
    'This is one beat in a continuous 15-20 second story. Keep visual continuity with adjacent scenes (same world, believable transition, consistent time of day).';

  if (index === 0) {
    return `${basePrompt} Opening hook: lead with an unexpected visual reveal in the first second that creates curiosity and makes viewers think "wait, what happens next?" Do not pitch services yet. ${continuitySuffix} ${realismSuffix}`;
  }

  if (index === totalScenes - 1) {
    return `${basePrompt} Final scene direction: this is the reveal/offer beat. Introduce the service clearly in the final seconds, with grounded local-commercial realism and no synthetic look. ${continuitySuffix} ${realismSuffix}`;
  }

  return `${basePrompt} Middle story beat: visually continue the previous scene and explain one key phenomenon/value point before the reveal. Keep momentum and clarity. ${continuitySuffix} ${realismSuffix}`;
}

function buildNarrationScript(
  tmpl: (typeof templates)[number],
  overrides: SceneOverrides | undefined,
  locality?: string,
  phoneNumber?: string
): string {
  const lines: string[] = ['If this happened to you, pay attention for the next few seconds.'];

  tmpl.scenes.forEach((scene, i) => {
    const override = overrides?.[i];
    const rawText = override?.text ?? scene.overlay.text;
    if (rawText) {
      lines.push(replacePlaceholders(rawText, { locality, phoneNumber }));
    }

    const rawCta = override?.cta ?? scene.overlay.cta;
    if (rawCta && i === tmpl.scenes.length - 1) {
      lines.push(replacePlaceholders(rawCta, { locality, phoneNumber }));
    }
  });

  lines.push('Now here is what to do next.');
  lines.push('Free consultation. No fee unless we win.');

  return lines
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
}

async function uploadSelfieAssets(selfieUrls: string[]): Promise<UploadedSelfie[]> {
  const unique = Array.from(new Set(selfieUrls.filter(Boolean)));
  const assets = await Promise.all(
    unique.map(async (url) => {
      const localPath = normalizePublicPath(url);
      if (!fs.existsSync(localPath)) {
        throw new Error(`Selfie file not found: ${url}`);
      }
      const publicUrl = await uploadToR2(localPath);
      return {
        localUrl: url,
        publicUrl,
        isVideo: isVideoFile(url),
      };
    })
  );
  return assets;
}

async function extractAttorneyVoiceTrack(
  uploadedSelfies: UploadedSelfie[],
  outputDir: string
): Promise<string | undefined> {
  const videoAsset = uploadedSelfies.find((asset) => asset.isVideo);
  if (!videoAsset) return undefined;

  const localPath = normalizePublicPath(videoAsset.localUrl);
  if (!fs.existsSync(localPath)) return undefined;

  try {
    return await extractAudioTrack(localPath, outputDir);
  } catch (err) {
    console.warn('[audio] Failed to extract audio from attorney video:', err);
    return undefined;
  }
}

// Bundled background audio tracks (royalty-free)
const AUDIO_DIR = path.join(ROOT, 'public', 'audio');
const BUNDLED_TRACKS: Record<string, { label: string; file: string }> = {
  dramatic: { label: 'Dramatic / Tense', file: 'dramatic.mp3' },
  hopeful: { label: 'Hopeful / Uplifting', file: 'hopeful.mp3' },
  urgent: { label: 'Urgent / Fast-Paced', file: 'urgent.mp3' },
  corporate: { label: 'Corporate / Professional', file: 'corporate.mp3' },
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/output', express.static(OUTPUT_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/audio', express.static(AUDIO_DIR));

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});
const upload = multer({ storage });

// --- Routes ---

app.get('/api/templates', (_req, res) => {
  const list = templates.map((t) => ({
    caseType: t.caseType,
    storyline: t.storyline,
    sceneCount: t.scenes.length,
  }));
  res.json(list);
});

app.get('/api/templates/:caseType', (req, res) => {
  const t = templates.find((t) => t.caseType === req.params.caseType);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  return res.json(t);
});

app.get('/api/audio-tracks', (_req, res) => {
  const tracks = Object.entries(BUNDLED_TRACKS).map(([id, track]) => ({
    id,
    label: track.label,
    url: `/audio/${track.file}`,
    available: fs.existsSync(path.join(AUDIO_DIR, track.file)),
  }));
  res.json(tracks);
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  return res.json({
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`,
    path: req.file.path,
  });
});

app.post('/api/generate', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const {
      caseType,
      overrides,
      logoUrl,
      selfieUrl,
      selfieUrls,
      phoneNumber,
      locality,
      audioTrack,
      audioUrl,
      audioMode,
      layout,
    } = req.body as {
      caseType: string;
      overrides?: SceneOverrides;
      logoUrl?: string;
      selfieUrl?: string;
      selfieUrls?: string[];
      phoneNumber?: string;
      locality?: string;
      audioTrack?: string;
      audioUrl?: string;
      audioMode?: AudioMode;
      layout?: VideoLayout;
    };

    const foundTemplate = templates.find((t) => t.caseType === caseType);
    if (!foundTemplate) {
      res.write(
        `data: ${JSON.stringify({ type: 'error', details: 'Unknown template' })}\n\n`
      );
      res.end();
      return;
    }
    const tmpl = foundTemplate;

    const selectedLayout = parseLayout(layout);
    const { aspectRatio } = getLayoutSpec(selectedLayout);

    const selectedAudioMode = parseAudioMode(audioMode);

    const selfiePool = Array.isArray(selfieUrls)
      ? selfieUrls.filter(Boolean)
      : [];
    if (selfieUrl) selfiePool.push(selfieUrl);

    let uploadedSelfies: UploadedSelfie[] = [];
    if (selfiePool.length > 0) {
      res.write(
        `data: ${JSON.stringify({
          type: 'status',
          message: 'Uploading attorney references...',
        })}\n\n`
      );
      uploadedSelfies = await uploadSelfieAssets(selfiePool);
    }

    const selfieImageRefs = uploadedSelfies
      .filter((asset) => !asset.isVideo)
      .map((asset) => asset.publicUrl);

    const jobId = uuid();
    const jobDir = path.join(OUTPUT_DIR, jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    const composedClips: string[] = new Array(tmpl.scenes.length);

    async function processScene(i: number) {
      const scene = tmpl.scenes[i];
      const override = overrides?.[i];

      const rawOverlayText = override?.text ?? scene.overlay.text;
      const rawCtaText = override?.cta ?? scene.overlay.cta;
      const overlayText = rawOverlayText
        ? replacePlaceholders(rawOverlayText, { locality })
        : undefined;
      const ctaText = rawCtaText
        ? replacePlaceholders(rawCtaText, { locality, phoneNumber })
        : undefined;

      const prompt = buildScenePrompt(
        replacePlaceholders(scene.prompt, { locality }),
        i,
        tmpl.scenes.length
      );

      let generatedPath: string;

      if (scene.source === 'selfie' && uploadedSelfies.length > 0) {
        const asset = uploadedSelfies[i % uploadedSelfies.length];

        if (asset.isVideo) {
          const result = await editVideo(
            {
              prompt,
              videoUrl: asset.publicUrl,
              aspectRatio,
              resolution: '720p',
            },
            jobDir
          );
          generatedPath = result.filePath;
        } else {
          const result = await generateFromImage(
            {
              prompt,
              imageUrl: asset.publicUrl,
              imageUrls: selfieImageRefs,
              duration: scene.duration,
              aspectRatio,
              resolution: '720p',
            },
            jobDir
          );
          generatedPath = result.filePath;
        }
      } else {
        const result = await generateVideo(
          {
            prompt,
            duration: scene.duration,
            aspectRatio,
            resolution: '720p',
          },
          jobDir
        );
        generatedPath = result.filePath;
      }

      const composedPath = path.join(jobDir, `scene_${i}_composed.mp4`);
      const textOverlays = overlayText
        ? [
            {
              text: overlayText,
              position: scene.overlay.position,
            },
          ]
        : [];

      const logoPath = logoUrl ? normalizePublicPath(logoUrl) : undefined;
      const logoScale = i === tmpl.scenes.length - 1 ? 1.7 : 1;

      await composeScene({
        inputPath: generatedPath,
        outputPath: composedPath,
        duration: scene.duration,
        textOverlays,
        logoPath,
        logoScale,
        ctaText,
        disclaimer: i === tmpl.scenes.length - 1 ? tmpl.disclaimer : undefined,
        layout: selectedLayout,
      });

      composedClips[i] = composedPath;

      res.write(
        `data: ${JSON.stringify({
          type: 'scene',
          index: i,
          url: `/output/${jobId}/scene_${i}_composed.mp4`,
        })}\n\n`
      );
    }

    await Promise.all(tmpl.scenes.map((_, i) => processScene(i)));

    const missingClipIndex = composedClips.findIndex((p) => !p || !fs.existsSync(p));
    if (missingClipIndex !== -1) {
      throw new Error(`Scene ${missingClipIndex + 1} failed to compose for concat`);
    }

    const concatPath = path.join(jobDir, 'final_concat.mp4');
    await concatClips(composedClips, concatPath, selectedLayout);

    let finalPath: string;
    let audioSource: string | undefined;
    let shouldLoopAudio = true;
    let audioVolume = 0.6;
    let fadeOutSeconds = 1.5;

    if (selectedAudioMode === 'music') {
      if (audioTrack?.startsWith('ai-')) {
        const mood = audioTrack.slice(3);
        const musicPrompt = MUSIC_PROMPTS[mood] || MUSIC_PROMPTS.corporate;
        const totalDurationMs = tmpl.scenes.reduce((sum, s) => sum + s.duration, 0) * 1000;
        res.write(
          `data: ${JSON.stringify({
            type: 'status',
            message: 'Generating background music...',
          })}\n\n`
        );
        audioSource = await generateMusic(musicPrompt, totalDurationMs, jobDir);
      } else if (audioTrack && BUNDLED_TRACKS[audioTrack]) {
        audioSource = path.join(AUDIO_DIR, BUNDLED_TRACKS[audioTrack].file);
      } else if (audioUrl) {
        audioSource = normalizePublicPath(audioUrl);
      }
    }

    if (selectedAudioMode === 'narration') {
      shouldLoopAudio = false;
      audioVolume = 1;
      fadeOutSeconds = 0;

      if (audioUrl) {
        audioSource = normalizePublicPath(audioUrl);
      } else {
        const trackId = (audioTrack as NarrationTrackId | undefined) ?? 'narration-attorney-video';

        if (trackId === 'narration-attorney-video') {
          res.write(
            `data: ${JSON.stringify({
              type: 'status',
              message: 'Extracting narration from uploaded attorney video...',
            })}\n\n`
          );
          audioSource = await extractAttorneyVoiceTrack(uploadedSelfies, jobDir);

          if (!audioSource) {
            res.write(
              `data: ${JSON.stringify({
                type: 'status',
                message: 'No usable attorney video audio found, generating narration...',
              })}\n\n`
            );
          }
        }

        if (!audioSource) {
          const voiceStyle: NarrationVoice = trackId === 'narration-male' ? 'male' : 'female';
          const narrationScript = buildNarrationScript(
            tmpl,
            overrides,
            locality,
            phoneNumber
          );
          res.write(
            `data: ${JSON.stringify({
              type: 'status',
              message: 'Generating narration track...',
            })}\n\n`
          );
          audioSource = await generateNarrationTrack(narrationScript, jobDir, voiceStyle);
        }
      }
    }

    if (audioSource && fs.existsSync(audioSource)) {
      finalPath = path.join(jobDir, 'final_reel.mp4');
      console.log(`[audio] Mixing audio: ${audioSource}`);
      await mixAudio(concatPath, audioSource, finalPath, {
        loop: shouldLoopAudio,
        volume: audioVolume,
        fadeOutSeconds,
      });
      if (fs.existsSync(concatPath)) fs.unlinkSync(concatPath);
    } else {
      const reelPath = path.join(jobDir, 'final_reel.mp4');
      fs.renameSync(concatPath, reelPath);
      finalPath = reelPath;
    }

    res.write(
      `data: ${JSON.stringify({
        type: 'complete',
        url: `/output/${jobId}/final_reel.mp4`,
        layout: selectedLayout,
        audioMode: selectedAudioMode,
        scenes: composedClips.map((_, i) => ({
          url: `/output/${jobId}/scene_${i}_composed.mp4`,
        })),
      })}\n\n`
    );
    res.end();
  } catch (err) {
    console.error('Generate error:', err);
    res.write(
      `data: ${JSON.stringify({ type: 'error', details: String(err) })}\n\n`
    );
    res.end();
  }
});

// ==========================================================================
// New Format-Based Ad Generation (Plan → Generate pipeline)
// ==========================================================================

/** List all available ad formats with their recipes */
app.get('/api/formats', (_req, res) => {
  const formats = FORMAT_RECIPES.map((r) => ({
    formatType: r.formatType,
    label: r.label,
    description: r.description,
    piTier: r.piTier,
    preferredStructures: r.preferredStructures,
  }));
  res.json(formats);
});

/** List available ElevenLabs voices */
app.get('/api/voices', async (_req, res) => {
  try {
    const voices = await fetchVoices();
    res.json(voices);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** Generate an ad plan using the LLM planner (no video generation yet) */
app.post('/api/plan', async (req, res) => {
  try {
    const {
      caseType,
      platform,
      audienceTemp,
      formatType,
      tone,
      firmName,
      phoneNumber,
      locality,
    } = req.body as {
      caseType: CaseType;
      platform: Platform;
      audienceTemp: AudienceTemp;
      formatType?: AdFormatType;
      tone?: AdTone;
      firmName?: string;
      phoneNumber?: string;
      locality?: string;
    };

    if (!caseType || !platform || !audienceTemp) {
      res.status(400).json({ error: 'caseType, platform, and audienceTemp are required' });
      return;
    }

    const plan = await generateAdPlan({
      caseType,
      platform,
      audienceTemp,
      formatType,
      tone,
      firmName,
      phoneNumber,
      locality,
    });

    res.json(plan);
  } catch (err) {
    console.error('Plan error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/** Generate a full campaign batch (multiple plans across platforms) */
app.post('/api/plan/batch', async (req, res) => {
  try {
    const { caseType, firmName, phoneNumber, locality, platforms, audienceTemps } = req.body as {
      caseType: CaseType;
      firmName?: string;
      phoneNumber?: string;
      locality?: string;
      platforms?: Platform[];
      audienceTemps?: AudienceTemp[];
    };

    if (!caseType) {
      res.status(400).json({ error: 'caseType is required' });
      return;
    }

    const plans = await generateCampaignBatch(caseType, {
      firmName,
      phoneNumber,
      locality,
      platforms,
      audienceTemps,
    });

    res.json(plans);
  } catch (err) {
    console.error('Batch plan error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/** Execute an ad plan — generates video clips, composes, and mixes audio */
app.post('/api/generate-from-plan', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const {
      plan,
      logoUrl,
      selfieUrl,
      selfieUrls,
    } = req.body as {
      plan: AdPlan;
      logoUrl?: string;
      selfieUrl?: string;
      selfieUrls?: string[];
    };

    if (!plan || !plan.scenes || plan.scenes.length === 0) {
      res.write(`data: ${JSON.stringify({ type: 'error', details: 'Invalid plan' })}\n\n`);
      res.end();
      return;
    }

    const selectedLayout: VideoLayout = 'portrait'; // All platforms are 9:16
    const { aspectRatio } = getLayoutSpec(selectedLayout);

    // Handle selfie uploads
    const selfiePool = Array.isArray(selfieUrls) ? selfieUrls.filter(Boolean) : [];
    if (selfieUrl) selfiePool.push(selfieUrl);

    let uploadedSelfies: UploadedSelfie[] = [];
    if (selfiePool.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Uploading attorney references...' })}\n\n`);
      uploadedSelfies = await uploadSelfieAssets(selfiePool);
    }

    const selfieImageRefs = uploadedSelfies
      .filter((asset) => !asset.isVideo)
      .map((asset) => asset.publicUrl);

    const jobId = uuid();
    const jobDir = path.join(OUTPUT_DIR, jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    // Save the plan for reference
    fs.writeFileSync(path.join(jobDir, 'plan.json'), JSON.stringify(plan, null, 2));

    res.write(`data: ${JSON.stringify({
      type: 'status',
      message: `Generating ${plan.formatType} ad for ${plan.caseType} (${plan.platform}, ${plan.totalDuration}s)...`,
    })}\n\n`);

    // Generate each scene clip
    const composedClips: string[] = new Array(plan.scenes.length);

    async function processPlanScene(i: number) {
      const scene = plan.scenes[i];
      const prompt = replacePlaceholders(scene.visualPrompt, {
        locality: plan.locality,
        phoneNumber: plan.phoneNumber,
      });

      let generatedPath: string;

      if (scene.videoSource === 'selfie' && uploadedSelfies.length > 0) {
        const asset = uploadedSelfies[i % uploadedSelfies.length];
        if (asset.isVideo) {
          const result = await editVideo(
            { prompt, videoUrl: asset.publicUrl, aspectRatio, resolution: '720p' },
            jobDir
          );
          generatedPath = result.filePath;
        } else {
          const result = await generateFromImage(
            {
              prompt,
              imageUrl: asset.publicUrl,
              imageUrls: selfieImageRefs,
              duration: scene.duration,
              aspectRatio,
              resolution: '720p',
            },
            jobDir
          );
          generatedPath = result.filePath;
        }
      } else {
        const result = await generateVideo(
          { prompt, duration: scene.duration, aspectRatio, resolution: '720p' },
          jobDir
        );
        generatedPath = result.filePath;
      }

      // Compose with text overlay
      const composedPath = path.join(jobDir, `scene_${i}_composed.mp4`);
      const overlayText = scene.textOverlay
        ? replacePlaceholders(scene.textOverlay, { locality: plan.locality, phoneNumber: plan.phoneNumber })
        : undefined;
      const ctaText = scene.ctaText
        ? replacePlaceholders(scene.ctaText, { locality: plan.locality, phoneNumber: plan.phoneNumber })
        : undefined;

      const textOverlays = overlayText
        ? [{ text: overlayText, position: scene.overlayPosition }]
        : [];

      const logoPath = logoUrl ? normalizePublicPath(logoUrl) : undefined;
      const logoScale = scene.showLogo ? 1.7 : 1;
      const isLastScene = i === plan.scenes.length - 1;

      await composeScene({
        inputPath: generatedPath,
        outputPath: composedPath,
        duration: scene.duration,
        textOverlays,
        logoPath: scene.showLogo ? logoPath : undefined,
        logoScale,
        ctaText,
        disclaimer: isLastScene ? plan.disclaimer : undefined,
        layout: selectedLayout,
      });

      composedClips[i] = composedPath;

      res.write(`data: ${JSON.stringify({
        type: 'scene',
        index: i,
        url: `/output/${jobId}/scene_${i}_composed.mp4`,
        primitive: scene.primitive,
        duration: scene.duration,
      })}\n\n`);
    }

    // Generate scenes in parallel
    await Promise.all(plan.scenes.map((_, i) => processPlanScene(i)));

    const missingClipIndex = composedClips.findIndex((p) => !p || !fs.existsSync(p));
    if (missingClipIndex !== -1) {
      throw new Error(`Scene ${missingClipIndex + 1} failed to compose`);
    }

    // Concatenate clips
    const concatPath = path.join(jobDir, 'final_concat.mp4');
    await concatClips(composedClips, concatPath, selectedLayout);

    // Handle audio
    let finalPath: string;
    let audioFilePath: string | undefined;

    if (plan.audio.source === 'elevenlabs' && plan.audio.script && plan.audio.voiceId) {
      res.write(`data: ${JSON.stringify({
        type: 'status',
        message: `Generating narration with ${plan.audio.voiceName || plan.audio.voiceId}...`,
      })}\n\n`);

      audioFilePath = await generateNarration({
        script: plan.audio.script,
        voiceId: plan.audio.voiceId,
        outputDir: jobDir,
      });
    } else if (plan.audio.source === 'music_only' && plan.audio.musicMood) {
      res.write(`data: ${JSON.stringify({
        type: 'status',
        message: 'Generating background music...',
      })}\n\n`);

      const musicPrompt = MUSIC_PROMPTS[plan.audio.musicMood] || MUSIC_PROMPTS.dramatic;
      audioFilePath = await generateMusic(musicPrompt, plan.totalDuration * 1000, jobDir);
    }
    // For 'grok' audio source, the video already has audio from Grok native generation
    // For 'silent', no audio needed

    if (audioFilePath && fs.existsSync(audioFilePath)) {
      finalPath = path.join(jobDir, 'final_reel.mp4');
      const isNarration = plan.audio.source === 'elevenlabs';

      await mixAudio(concatPath, audioFilePath, finalPath, {
        loop: !isNarration,
        volume: isNarration ? 1 : 0.6,
        fadeOutSeconds: isNarration ? 0 : 1.5,
      });

      if (fs.existsSync(concatPath)) fs.unlinkSync(concatPath);
    } else {
      const reelPath = path.join(jobDir, 'final_reel.mp4');
      fs.renameSync(concatPath, reelPath);
      finalPath = reelPath;
    }

    res.write(`data: ${JSON.stringify({
      type: 'complete',
      url: `/output/${jobId}/final_reel.mp4`,
      plan: {
        id: plan.id,
        formatType: plan.formatType,
        caseType: plan.caseType,
        platform: plan.platform,
        audienceTemp: plan.audienceTemp,
        tone: plan.tone,
        totalDuration: plan.totalDuration,
        clipStructure: plan.clipStructure,
        audioSource: plan.audio.source,
        voiceName: plan.audio.voiceName,
      },
      layout: selectedLayout,
      scenes: composedClips.map((_, i) => ({
        url: `/output/${jobId}/scene_${i}_composed.mp4`,
      })),
    })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Generate-from-plan error:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', details: String(err) })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Ad generator server running on http://localhost:${PORT}`);
});
