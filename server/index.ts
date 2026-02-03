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
  cleanSpeechTrack,
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
import { applyRemotionWordCaptions, type CaptionStyle } from './remotionCaptions.js';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'output');
const UPLOADS_DIR = path.join(ROOT, 'uploads');
const DEFAULT_REMOTION_DIR = path.join(ROOT, 'remotion-template-tiktok');
const REMOTION_TIKTOK_DIR = process.env.REMOTION_TIKTOK_DIR || DEFAULT_REMOTION_DIR;

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
type CaptionMode = 'none' | 'remotion-word';

const TARGET_NARRATION_WORDS_PER_SECOND = 2.75;
const NARRATION_DURATION_HEADROOM = 1.0;

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

function parseCaptionMode(mode?: string): CaptionMode {
  if (mode === 'remotion-word' || mode === 'none') return mode;
  return 'remotion-word';
}

function parseCaptionStyle(style?: string): CaptionStyle {
  if (style === 'impact' || style === 'clean' || style === 'kinetic') {
    return style;
  }
  return 'impact';
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

function sanitizeContextSnippet(text: string | undefined, maxChars = 160): string {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.length <= maxChars ? cleaned : `${cleaned.slice(0, maxChars).replace(/[,\s]+$/g, '')}...`;
}

function buildPlanScenePrompt(plan: AdPlan, index: number): string {
  const scene = plan.scenes[index];
  const basePrompt = replacePlaceholders(scene.visualPrompt, {
    locality: plan.locality,
    phoneNumber: plan.phoneNumber,
  });

  const prev = index > 0 ? plan.scenes[index - 1] : undefined;
  const next = index < plan.scenes.length - 1 ? plan.scenes[index + 1] : undefined;

  const prevContext = prev
    ? `Previous beat context: ${prev.primitive}${prev.textOverlay ? `, overlay "${sanitizeContextSnippet(replacePlaceholders(prev.textOverlay, { locality: plan.locality, phoneNumber: plan.phoneNumber }), 70)}"` : ''}. Visual cue: ${sanitizeContextSnippet(replacePlaceholders(prev.visualPrompt, { locality: plan.locality, phoneNumber: plan.phoneNumber }))}`
    : '';
  const nextContext = next
    ? `Next beat intent: ${next.primitive}${next.textOverlay ? `, overlay "${sanitizeContextSnippet(replacePlaceholders(next.textOverlay, { locality: plan.locality, phoneNumber: plan.phoneNumber }), 70)}"` : ''}.`
    : '';

  const beatDirection =
    index === 0
      ? 'Opening beat: establish the scene language for the whole ad and create immediate curiosity.'
      : index === plan.scenes.length - 1
      ? 'Final beat: resolve the story naturally and land the offer/CTA in the last seconds.'
      : 'Middle beat: feel like a direct continuation of the previous clip, not a visual reset.';

  const continuityDirection =
    'Continuity lock: keep the same world across scenes (matching location character, time-of-day lighting, weather, color palette, wardrobe/props, and camera language). Use believable transitions as if this is one continuous short film.';

  return `${basePrompt} ${beatDirection} ${continuityDirection} ${prevContext} ${nextContext}`;
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
      const contextText = [rawText, ...lines].filter(Boolean).join(' ');
      lines.push(
        expandNarrationCta(replacePlaceholders(rawCta, { locality, phoneNumber }), {
          contextText,
        })
      );
    }
  });

  lines.push('Now here is what to do next.');
  lines.push('Free consultation. No fee unless we win.');

  return lines
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
}

function fitNarrationScriptToDuration(script: string, durationSeconds: number): string {
  const cleaned = script.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const maxWords = Math.max(
    1,
    Math.floor(durationSeconds * TARGET_NARRATION_WORDS_PER_SECOND * NARRATION_DURATION_HEADROOM)
  );
  const words = cleaned.split(' ').filter(Boolean);
  if (words.length <= maxWords) {
    return cleaned;
  }

  const trimmed = words.slice(0, maxWords).join(' ').trim();
  const sentenceEnd = Math.max(trimmed.lastIndexOf('. '), trimmed.lastIndexOf('! '), trimmed.lastIndexOf('? '));
  if (sentenceEnd > Math.floor(trimmed.length * 0.6)) {
    return trimmed.slice(0, sentenceEnd + 1).trim();
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function buildSceneSyncedPlanNarration(plan: AdPlan): string {
  // Prefer per-scene scripts from LLM (sceneScript fields) for precise timing
  const hasSceneScripts = plan.scenes.some((s) => s.sceneScript);

  if (hasSceneScripts) {
    const parts: string[] = [];
    for (const scene of plan.scenes) {
      if (scene.sceneScript) {
        parts.push(
          replacePlaceholders(scene.sceneScript.replace(/\s+/g, ' ').trim(), {
            locality: plan.locality,
            phoneNumber: plan.phoneNumber,
          })
        );
      }
    }
    const joined = parts.filter(Boolean).join(' ');
    return joined || '';
  }

  // Fallback: build from overlays
  const lines: string[] = [];

  for (const scene of plan.scenes) {
    if (scene.textOverlay) {
      lines.push(
        replacePlaceholders(scene.textOverlay, {
          locality: plan.locality,
          phoneNumber: plan.phoneNumber,
        })
      );
    }

    if (scene.ctaText) {
      const sceneContextText = `${scene.textOverlay || ''} ${plan.caseType} ${plan.tone}`.trim();
      lines.push(
        expandNarrationCta(
          replacePlaceholders(scene.ctaText, {
            locality: plan.locality,
            phoneNumber: plan.phoneNumber,
          }),
          { contextText: sceneContextText }
        )
      );
    }
  }

  const script = lines
    .map((line) => line.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/g, ''))
    .filter(Boolean)
    .join('. ');

  return script ? `${script}.` : '';
}

function inferNarrationGoal(contextText: string): string {
  const normalized = contextText.toLowerCase();

  if (/(wrongful|death|family|grief|loss|funeral)/.test(normalized)) {
    return 'hold them accountable and pursue justice for your family';
  }

  if (/(insurance|lowball|denied|evidence|claim|report it|app data|receipt)/.test(normalized)) {
    return 'protect your claim before insurance cuts it down';
  }

  if (/(medical|hospital|rehab|treatment|injury|pain|wages|work)/.test(normalized)) {
    return 'fight for compensation for medical bills, lost wages, and pain';
  }

  return 'fight for the compensation you deserve';
}

function expandNarrationCta(
  rawCta: string,
  opts?: { contextText?: string }
): string {
  const cta = rawCta.replace(/\s+/g, ' ').trim();
  if (!cta) return '';

  const normalized = cta.toLowerCase();
  const goal = inferNarrationGoal(opts?.contextText || '');

  if (normalized.includes('link in bio')) {
    return `Tap the link in bio now for a free consultation so we can ${goal}.`;
  }

  if (normalized.includes('click below')) {
    return `Click below now for a free consultation so we can ${goal}.`;
  }

  if (normalized.startsWith('call now')) {
    return `${cta}. Reach out now for a free consultation so we can ${goal}.`;
  }

  const shortWordCount = normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  if (shortWordCount <= 4) {
    return `${cta}. Reach out now for a free consultation so we can ${goal}.`;
  }

  return cta;
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
    const rawTrack = await extractAudioTrack(localPath, outputDir);
    return await cleanSpeechTrack(rawTrack, outputDir);
  } catch (err) {
    console.warn('[audio] Failed to extract audio from attorney video:', err);
    return undefined;
  }
}

function preparePlanForAttorneyFeature(plan: AdPlan, hasAttorneyVideo: boolean): AdPlan {
  if (!hasAttorneyVideo) return plan;

  const scenes = plan.scenes.map((scene) => {
    if (scene.primitive === 'attorney_direct') {
      return { ...scene, videoSource: 'selfie' as const };
    }
    return scene;
  });

  const hasAttorneyScene = scenes.some((scene) => scene.primitive === 'attorney_direct');
  if (!hasAttorneyScene && plan.formatType === 'attorney_direct' && scenes[0]) {
    scenes[0] = { ...scenes[0], videoSource: 'selfie' as const };
  }

  return { ...plan, scenes };
}

function buildAttorneyCleanupPrompt(basePrompt: string): string {
  return `${basePrompt} Preserve the attorney's real identity and natural speaking performance. Stabilize handheld shake, reduce noise/grain, improve lighting balance, and apply premium cinematic color grading while keeping skin tones realistic. Keep mouth movement natural and avoid face warping or uncanny artifacts.`;
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

// Serve built frontend in production
const DIST_DIR = path.join(ROOT, 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
}

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
      firmName,
      phoneNumber,
      locality,
      audioTrack,
      audioUrl,
      audioMode,
      layout,
      captionMode,
      captionStyle,
      sequentialScenes,
    } = req.body as {
      caseType: string;
      overrides?: SceneOverrides;
      logoUrl?: string;
      selfieUrl?: string;
      selfieUrls?: string[];
      firmName?: string;
      phoneNumber?: string;
      locality?: string;
      audioTrack?: string;
      audioUrl?: string;
      audioMode?: AudioMode;
      layout?: VideoLayout;
      captionMode?: CaptionMode;
      captionStyle?: CaptionStyle;
      sequentialScenes?: boolean;
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
    const selectedCaptionMode = parseCaptionMode(captionMode);
    const selectedCaptionStyle = parseCaptionStyle(captionStyle);

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
      const shouldBurnSceneText = selectedCaptionMode !== 'remotion-word';
      const textOverlays = shouldBurnSceneText && overlayText
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

    const shouldGenerateSequentially = sequentialScenes !== false;
    if (shouldGenerateSequentially) {
      for (let i = 0; i < tmpl.scenes.length; i++) {
        await processScene(i);
      }
    } else {
      await Promise.all(tmpl.scenes.map((_, i) => processScene(i)));
    }

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
      const totalDurationSeconds = tmpl.scenes.reduce((sum, s) => sum + s.duration, 0);

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
          const narrationScript = fitNarrationScriptToDuration(
            buildNarrationScript(
              tmpl,
              overrides,
              locality,
              phoneNumber
            ),
            totalDurationSeconds
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

    if (selectedCaptionMode === 'remotion-word') {
      res.write(
        `data: ${JSON.stringify({
          type: 'status',
          message: 'Applying Remotion animated word captions...',
        })}\n\n`
      );
      try {
        finalPath = await applyRemotionWordCaptions({
          inputVideoPath: finalPath,
          outputDir: jobDir,
          style: selectedCaptionStyle,
          projectDir: REMOTION_TIKTOK_DIR,
          entityName: firmName,
        });
      } catch (captionErr) {
        console.warn('[captions] Remotion captioning skipped:', captionErr);
        res.write(
          `data: ${JSON.stringify({
            type: 'status',
            message: `Captioning skipped: ${String(captionErr)}`,
          })}\n\n`
        );
      }
    }

    const finalFilename = path.basename(finalPath);

    res.write(
      `data: ${JSON.stringify({
        type: 'complete',
        url: `/output/${jobId}/${finalFilename}`,
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
      captionMode,
      captionStyle,
      sequentialScenes,
    } = req.body as {
      plan: AdPlan;
      logoUrl?: string;
      selfieUrl?: string;
      selfieUrls?: string[];
      captionMode?: CaptionMode;
      captionStyle?: CaptionStyle;
      sequentialScenes?: boolean;
    };

    if (!plan || !plan.scenes || plan.scenes.length === 0) {
      res.write(`data: ${JSON.stringify({ type: 'error', details: 'Invalid plan' })}\n\n`);
      res.end();
      return;
    }

    const selectedLayout: VideoLayout = 'portrait'; // All platforms are 9:16
    const { aspectRatio } = getLayoutSpec(selectedLayout);
    const selectedCaptionMode = parseCaptionMode(captionMode);
    const selectedCaptionStyle = parseCaptionStyle(captionStyle);

    // Handle selfie uploads
    const selfiePool = Array.isArray(selfieUrls) ? selfieUrls.filter(Boolean) : [];
    if (selfieUrl) selfiePool.push(selfieUrl);

    let uploadedSelfies: UploadedSelfie[] = [];
    if (selfiePool.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Uploading attorney references...' })}\n\n`);
      uploadedSelfies = await uploadSelfieAssets(selfiePool);
    }
    const hasAttorneyVideo = uploadedSelfies.some((asset) => asset.isVideo);
    const effectivePlan = preparePlanForAttorneyFeature(plan, hasAttorneyVideo);

    const selfieImageRefs = uploadedSelfies
      .filter((asset) => !asset.isVideo)
      .map((asset) => asset.publicUrl);

    const jobId = uuid();
    const jobDir = path.join(OUTPUT_DIR, jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    // Save the plan for reference
    fs.writeFileSync(path.join(jobDir, 'plan.json'), JSON.stringify(effectivePlan, null, 2));

    res.write(`data: ${JSON.stringify({
      type: 'status',
      message: `Generating ${effectivePlan.formatType} ad for ${effectivePlan.caseType} (${effectivePlan.platform}, ${effectivePlan.totalDuration}s)...`,
    })}\n\n`);

    const shouldGenerateSequentially = sequentialScenes !== false;
    res.write(`data: ${JSON.stringify({
      type: 'status',
      message: shouldGenerateSequentially
        ? 'Generating scenes sequentially for stronger visual continuity...'
        : 'Generating scenes in parallel for speed...',
    })}\n\n`);

    // Generate each scene clip
    const composedClips: string[] = new Array(effectivePlan.scenes.length);

    async function processPlanScene(i: number) {
      const scene = effectivePlan.scenes[i];
      const prompt = buildPlanScenePrompt(effectivePlan, i);

      let generatedPath: string;

      if (scene.videoSource === 'selfie' && uploadedSelfies.length > 0) {
        const attorneyVideoAsset = uploadedSelfies.find((asset) => asset.isVideo);
        const asset =
          scene.primitive === 'attorney_direct' && attorneyVideoAsset
            ? attorneyVideoAsset
            : uploadedSelfies[i % uploadedSelfies.length];
        if (asset.isVideo) {
          const editPrompt =
            scene.primitive === 'attorney_direct'
              ? buildAttorneyCleanupPrompt(prompt)
              : prompt;
          const result = await editVideo(
            { prompt: editPrompt, videoUrl: asset.publicUrl, aspectRatio, resolution: '720p' },
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
        ? replacePlaceholders(scene.textOverlay, { locality: effectivePlan.locality, phoneNumber: effectivePlan.phoneNumber })
        : undefined;
      const ctaText = scene.ctaText
        ? replacePlaceholders(scene.ctaText, { locality: effectivePlan.locality, phoneNumber: effectivePlan.phoneNumber })
        : undefined;

      const shouldBurnSceneText = selectedCaptionMode !== 'remotion-word';
      const textOverlays = shouldBurnSceneText && overlayText
        ? [{ text: overlayText, position: scene.overlayPosition }]
        : [];

      const logoPath = logoUrl ? normalizePublicPath(logoUrl) : undefined;
      const logoScale = scene.showLogo ? 1.7 : 1;
      const isLastScene = i === effectivePlan.scenes.length - 1;

      await composeScene({
        inputPath: generatedPath,
        outputPath: composedPath,
        duration: scene.duration,
        textOverlays,
        logoPath: scene.showLogo ? logoPath : undefined,
        logoScale,
        ctaText,
        disclaimer: isLastScene ? effectivePlan.disclaimer : undefined,
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

    if (shouldGenerateSequentially) {
      for (let i = 0; i < effectivePlan.scenes.length; i++) {
        await processPlanScene(i);
      }
    } else {
      await Promise.all(effectivePlan.scenes.map((_, i) => processPlanScene(i)));
    }

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

    const sceneSyncedScript = buildSceneSyncedPlanNarration(effectivePlan);
    const narrationScript = fitNarrationScriptToDuration(
      sceneSyncedScript || effectivePlan.audio.script || '',
      effectivePlan.totalDuration
    );

    const hasAttorneyDirectScene = effectivePlan.scenes.some((scene) => scene.primitive === 'attorney_direct');
    const shouldPreferAttorneyVoice =
      hasAttorneyVideo &&
      hasAttorneyDirectScene &&
      effectivePlan.audio.source !== 'silent';

    if (shouldPreferAttorneyVoice) {
      res.write(`data: ${JSON.stringify({
        type: 'status',
        message: 'Using uploaded attorney voice with AI cleanup...',
      })}\n\n`);
      audioFilePath = await extractAttorneyVoiceTrack(uploadedSelfies, jobDir);
    }

    if (!audioFilePath && effectivePlan.audio.source === 'elevenlabs' && narrationScript && effectivePlan.audio.voiceId) {
      res.write(`data: ${JSON.stringify({
        type: 'status',
        message: `Generating narration with ${effectivePlan.audio.voiceName || effectivePlan.audio.voiceId}...`,
      })}\n\n`);

      audioFilePath = await generateNarration({
        script: narrationScript,
        voiceId: effectivePlan.audio.voiceId,
        outputDir: jobDir,
      });
    } else if (!audioFilePath && effectivePlan.audio.source === 'music_only' && effectivePlan.audio.musicMood) {
      res.write(`data: ${JSON.stringify({
        type: 'status',
        message: 'Generating background music...',
      })}\n\n`);

      const musicPrompt = MUSIC_PROMPTS[effectivePlan.audio.musicMood] || MUSIC_PROMPTS.dramatic;
      audioFilePath = await generateMusic(musicPrompt, effectivePlan.totalDuration * 1000, jobDir);
    }
    // For 'grok' audio source, the video already has audio from Grok native generation
    // For 'silent', no audio needed

    if (audioFilePath && fs.existsSync(audioFilePath)) {
      finalPath = path.join(jobDir, 'final_reel.mp4');
      const isNarration = effectivePlan.audio.source === 'elevenlabs' || shouldPreferAttorneyVoice;

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

    if (selectedCaptionMode === 'remotion-word') {
      res.write(`data: ${JSON.stringify({
        type: 'status',
        message: 'Applying Remotion animated word captions...',
      })}\n\n`);
      try {
        finalPath = await applyRemotionWordCaptions({
          inputVideoPath: finalPath,
          outputDir: jobDir,
          style: selectedCaptionStyle,
          projectDir: REMOTION_TIKTOK_DIR,
          entityName: effectivePlan.firmName,
        });
      } catch (captionErr) {
        console.warn('[captions] Remotion captioning skipped:', captionErr);
        res.write(`data: ${JSON.stringify({
          type: 'status',
          message: `Captioning skipped: ${String(captionErr)}`,
        })}\n\n`);
      }
    }

    const finalFilename = path.basename(finalPath);

    res.write(`data: ${JSON.stringify({
      type: 'complete',
      url: `/output/${jobId}/${finalFilename}`,
      plan: {
        id: effectivePlan.id,
        formatType: effectivePlan.formatType,
        caseType: effectivePlan.caseType,
        platform: effectivePlan.platform,
        audienceTemp: effectivePlan.audienceTemp,
        tone: effectivePlan.tone,
        totalDuration: effectivePlan.totalDuration,
        clipStructure: effectivePlan.clipStructure,
        audioSource: shouldPreferAttorneyVoice ? 'attorney_video_voice' : effectivePlan.audio.source,
        voiceName: shouldPreferAttorneyVoice ? 'Uploaded Attorney Voice' : effectivePlan.audio.voiceName,
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

// SPA catch-all: serve index.html for any non-API route
app.get('{*path}', (_req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Not found');
  }
});

app.listen(PORT, () => {
  console.log(`Ad generator server running on http://localhost:${PORT}`);
});
