import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { createCanvas, type CanvasRenderingContext2D } from 'canvas';

interface TextOverlay {
  text: string;
  position: 'top' | 'center' | 'bottom';
  fontSize?: number;
  fontColor?: string;
}

export type VideoLayout = 'portrait' | 'square' | 'landscape';

export const LAYOUT_SPECS = {
  portrait: { width: 1080, height: 1920, aspectRatio: '9:16' },
  square: { width: 1080, height: 1080, aspectRatio: '1:1' },
  landscape: { width: 1920, height: 1080, aspectRatio: '16:9' },
} as const;

export function getLayoutSpec(layout: VideoLayout = 'portrait') {
  return LAYOUT_SPECS[layout] ?? LAYOUT_SPECS.portrait;
}

interface OverlayOptions {
  inputPath: string;
  outputPath: string;
  duration: number;
  textOverlays?: TextOverlay[];
  logoPath?: string;
  logoScale?: number;
  ctaText?: string;
  disclaimer?: string;
  layout?: VideoLayout;
}

interface MixAudioOptions {
  loop?: boolean;
  volume?: number;
  fadeOutSeconds?: number;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

const HERO_FONT_STACK = '"Arial Black","Impact",sans-serif';

function emphasizeOverlayText(text: string): string {
  return normalizeWhitespace(text).toUpperCase();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function splitLongToken(
  ctx: CanvasRenderingContext2D,
  token: string,
  maxWidth: number
): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const char of token) {
    const next = `${current}${char}`;
    if (ctx.measureText(next).width <= maxWidth || current.length === 0) {
      current = next;
    } else {
      chunks.push(current);
      current = char;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const cleaned = normalizeWhitespace(text);
  if (!cleaned) return [];

  const words = cleaned.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = '';
    }

    if (ctx.measureText(word).width <= maxWidth) {
      currentLine = word;
      continue;
    }

    const chunks = splitLongToken(ctx, word, maxWidth);
    if (chunks.length > 1) {
      lines.push(...chunks.slice(0, -1));
    }
    currentLine = chunks[chunks.length - 1] || '';
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function ellipsizeToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  const suffix = '...';
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}${suffix}`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out.replace(/[\s.,;:!?-]+$/g, '')}${suffix}`;
}

function fitTextBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  opts: {
    preferredFontSize: number;
    minFontSize: number;
    maxWidth: number;
    maxHeight: number;
    maxLines: number;
  }
): { fontSize: number; lineHeight: number; lines: string[] } {
  const step = 2;

  for (let size = opts.preferredFontSize; size >= opts.minFontSize; size -= step) {
    ctx.font = `900 ${size}px ${HERO_FONT_STACK}`;
    const lines = wrapText(ctx, text, opts.maxWidth);
    const lineHeight = Math.ceil(size * 1.22);
    const totalHeight = lines.length * lineHeight;

    if (lines.length <= opts.maxLines && totalHeight <= opts.maxHeight) {
      return { fontSize: size, lineHeight, lines };
    }
  }

  const fallbackSize = opts.minFontSize;
  ctx.font = `900 ${fallbackSize}px ${HERO_FONT_STACK}`;
  const lines = wrapText(ctx, text, opts.maxWidth);
  const limited = lines.slice(0, opts.maxLines);
  if (lines.length > opts.maxLines && limited.length > 0) {
    const lastIdx = limited.length - 1;
    limited[lastIdx] = ellipsizeToWidth(ctx, limited[lastIdx], opts.maxWidth);
  }

  return {
    fontSize: fallbackSize,
    lineHeight: Math.ceil(fallbackSize * 1.2),
    lines: limited,
  };
}

function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  opts: {
    centerX: number;
    centerY: number;
    lineHeight: number;
    fontSize: number;
    color: string;
  }
): void {
  if (lines.length === 0) return;

  ctx.font = `900 ${opts.fontSize}px ${HERO_FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.95)';
  ctx.fillStyle = opts.color;
  ctx.lineWidth = Math.max(4, Math.round(opts.fontSize * 0.14));

  const startY = opts.centerY - ((lines.length - 1) * opts.lineHeight) / 2;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const y = startY + i * opts.lineHeight;
    const lineWidth = ctx.measureText(line).width;
    const paddingX = Math.max(14, Math.round(opts.fontSize * 0.28));
    const paddingY = Math.max(6, Math.round(opts.fontSize * 0.12));
    const boxW = lineWidth + paddingX * 2;
    const boxH = opts.lineHeight + paddingY;
    const boxX = opts.centerX - boxW / 2;
    const boxY = y - boxH / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, Math.round(opts.fontSize * 0.18));
    ctx.fill();

    ctx.fillStyle = opts.color;
    ctx.strokeText(line, opts.centerX, y);
    ctx.fillText(line, opts.centerX, y);
  }
}

/**
 * Render all text (headlines, CTA, disclaimer) onto a single
 * transparent PNG that FFmpeg can overlay with the `overlay` filter.
 */
function renderTextOverlayPng(
  outPath: string,
  textOverlays: TextOverlay[],
  width: number,
  height: number,
  logoReservedTopPx: number,
  ctaText?: string,
  disclaimer?: string
): void {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, width, height);

  const textMaxWidth = Math.floor(width * 0.84);
  const topRegionCenter = Math.max(
    Math.round(height * 0.18),
    logoReservedTopPx + Math.round(height * 0.08)
  );
  const positionRegions: Record<TextOverlay['position'], { centerY: number; maxHeight: number }> = {
    top: { centerY: topRegionCenter, maxHeight: Math.round(height * 0.2) },
    center: { centerY: Math.round(height * 0.5), maxHeight: Math.round(height * 0.34) },
    bottom: { centerY: Math.round(height * 0.76), maxHeight: Math.round(height * 0.23) },
  };

  for (const overlay of textOverlays) {
    const emphaticText = emphasizeOverlayText(overlay.text);
    const region = positionRegions[overlay.position] ?? positionRegions.center;
    const fit = fitTextBlock(ctx, emphaticText, {
      preferredFontSize: overlay.fontSize || Math.max(58, Math.round(height * 0.04)),
      minFontSize: Math.max(30, Math.round(height * 0.022)),
      maxWidth: textMaxWidth,
      maxHeight: region.maxHeight,
      maxLines: 3,
    });

    drawTextBlock(ctx, fit.lines, {
      centerX: width / 2,
      centerY: region.centerY,
      lineHeight: fit.lineHeight,
      fontSize: fit.fontSize,
      color: overlay.fontColor || 'white',
    });
  }

  if (ctaText) {
    const fit = fitTextBlock(ctx, ctaText, {
      preferredFontSize: Math.max(34, Math.round(height * 0.026)),
      minFontSize: Math.max(22, Math.round(height * 0.015)),
      maxWidth: Math.floor(width * 0.9),
      maxHeight: Math.round(height * 0.12),
      maxLines: 3,
    });

    drawTextBlock(ctx, fit.lines, {
      centerX: width / 2,
      centerY: Math.round(height * 0.9),
      lineHeight: fit.lineHeight,
      fontSize: fit.fontSize,
      color: '#ffea00',
    });
  }

  if (disclaimer) {
    const fit = fitTextBlock(ctx, disclaimer, {
      preferredFontSize: Math.max(16, Math.round(height * 0.012)),
      minFontSize: Math.max(12, Math.round(height * 0.009)),
      maxWidth: Math.floor(width * 0.95),
      maxHeight: Math.round(height * 0.07),
      maxLines: 2,
    });

    drawTextBlock(ctx, fit.lines, {
      centerX: width / 2,
      centerY: Math.round(height * 0.965),
      lineHeight: fit.lineHeight,
      fontSize: fit.fontSize,
      color: 'rgba(255,255,255,0.8)',
    });
  }

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buf);
}

/**
 * Run an ffmpeg command as a promise.
 */
function runFfmpeg(
  buildCmd: (cmd: ReturnType<typeof ffmpeg>) => ReturnType<typeof ffmpeg>
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const cmd = buildCmd(ffmpeg());
    cmd
      .on('start', (cmdline: string) => console.log('[ffmpeg]', cmdline))
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run();
  });
}

function scalePadFilter(width: number, height: number): string {
  return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;
}

/**
 * Convert a still image into a video clip with a duration,
 * then apply text/logo overlays via FFmpeg overlay filter.
 */
export async function composeScene(opts: OverlayOptions): Promise<string> {
  const {
    inputPath,
    outputPath,
    duration,
    textOverlays = [],
    logoPath,
    logoScale = 1,
    ctaText,
    disclaimer,
    layout = 'portrait',
  } = opts;

  const { width, height } = getLayoutSpec(layout);
  const jobDir = path.dirname(outputPath);

  const ext = path.extname(inputPath).toLowerCase();
  const isImage = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);

  let videoInput = inputPath;

  if (isImage) {
    const tempVideo = path.join(jobDir, `still_${uuid()}.mp4`);
    await runFfmpeg((cmd) =>
      cmd
        .input(inputPath)
        .inputOptions(['-loop', '1'])
        .outputOptions([
          '-c:v', 'libx264',
          '-t', String(duration),
          '-pix_fmt', 'yuv420p',
          '-vf', scalePadFilter(width, height),
          '-r', '30',
        ])
        .output(tempVideo)
    );
    videoInput = tempVideo;
  }

  const hasText = textOverlays.length > 0 || ctaText || disclaimer;
  const hasLogo = logoPath && fs.existsSync(logoPath);
  const clampedScale = Math.max(0.75, Math.min(2.25, logoScale));
  const logoWidth = Math.max(100, Math.round(width * 0.14 * clampedScale));
  const margin = Math.max(30, Math.round(width * 0.04));
  const logoReservedTopPx = hasLogo ? margin + logoWidth + margin : 0;

  if (!hasText && !hasLogo) {
    if (!isImage) {
      await runFfmpeg((cmd) =>
        cmd
          .input(videoInput)
          .outputOptions([
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-vf', scalePadFilter(width, height),
          ])
          .output(outputPath)
      );
    } else {
      fs.copyFileSync(videoInput, outputPath);
    }
    cleanup(isImage, videoInput, inputPath);
    return outputPath;
  }

  let textPngPath: string | null = null;
  if (hasText) {
    textPngPath = path.join(jobDir, `text_${uuid()}.png`);
    renderTextOverlayPng(
      textPngPath,
      textOverlays,
      width,
      height,
      logoReservedTopPx,
      ctaText,
      disclaimer
    );
  }

  const inputs: string[] = [videoInput];
  const filterParts: string[] = [];
  let currentStream = '[0:v]';
  let inputIdx = 1;

  filterParts.push(`${currentStream}${scalePadFilter(width, height)}[base]`);
  currentStream = '[base]';

  if (textPngPath) {
    inputs.push(textPngPath);
    filterParts.push(`${currentStream}[${inputIdx}:v]overlay=0:0[withtext]`);
    currentStream = '[withtext]';
    inputIdx++;
  }

  if (hasLogo) {
    inputs.push(logoPath!);
    filterParts.push(`[${inputIdx}:v]scale=${logoWidth}:-1[logo]`);
    filterParts.push(`${currentStream}[logo]overlay=x=${margin}:y=${margin}[final]`);
    currentStream = '[final]';
  }

  const filterComplex = filterParts.join(';');
  const outLabel = currentStream.replace(/[\[\]]/g, '');

  await new Promise<void>((resolve, reject) => {
    let cmd = ffmpeg();
    for (const inp of inputs) {
      cmd = cmd.input(inp);
    }

    cmd
      .complexFilter(filterComplex, [outLabel])
      .outputOptions([
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        '-shortest',
      ])
      .output(outputPath)
      .on('start', (cmdline: string) => console.log('[ffmpeg overlay]', cmdline))
      .on('stderr', (line: string) => console.log('[ffmpeg stderr]', line))
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run();
  });

  cleanup(isImage, videoInput, inputPath);
  if (textPngPath && fs.existsSync(textPngPath)) fs.unlinkSync(textPngPath);

  return outputPath;
}

function cleanup(isImage: boolean, videoInput: string, inputPath: string) {
  if (isImage && videoInput !== inputPath && fs.existsSync(videoInput)) {
    fs.unlinkSync(videoInput);
  }
}

/**
 * Concatenate multiple video clips into one final reel.
 */
export async function concatClips(
  clipPaths: string[],
  outputPath: string,
  layout: VideoLayout = 'portrait'
): Promise<string> {
  if (clipPaths.length === 0) {
    throw new Error('No clips to concatenate');
  }

  const missingIdx = clipPaths.findIndex((p) => !p || !fs.existsSync(p));
  if (missingIdx !== -1) {
    throw new Error(`Clip missing before concat at index ${missingIdx}`);
  }

  if (clipPaths.length === 1) {
    fs.copyFileSync(clipPaths[0], outputPath);
    return outputPath;
  }

  const { width, height } = getLayoutSpec(layout);

  const normalizedPaths: string[] = [];
  for (let i = 0; i < clipPaths.length; i++) {
    const normPath = path.join(path.dirname(outputPath), `norm_${uuid()}_${i}.mp4`);
    await runFfmpeg((cmd) =>
      cmd
        .input(clipPaths[i])
        .outputOptions([
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-r', '30',
          '-vf', scalePadFilter(width, height),
          '-an',
        ])
        .output(normPath)
    );
    normalizedPaths.push(normPath);
  }

  const concatFile = path.join(path.dirname(outputPath), `concat_${uuid()}.txt`);
  const concatContent = normalizedPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join('\n');
  fs.writeFileSync(concatFile, concatContent);

  await runFfmpeg((cmd) =>
    cmd
      .input(concatFile)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .output(outputPath)
  );

  if (fs.existsSync(concatFile)) fs.unlinkSync(concatFile);
  for (const p of normalizedPaths) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  return outputPath;
}

function probeDurationSeconds(filePath: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const raw = data.format?.duration;
      if (!raw || Number.isNaN(raw)) {
        return reject(new Error(`Could not probe duration for ${filePath}`));
      }
      return resolve(raw);
    });
  });
}

/**
 * Mix an audio track into a video file.
 * For music, loop=true repeats the source as needed.
 */
export async function mixAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string,
  opts: MixAudioOptions = {}
): Promise<string> {
  const loop = opts.loop ?? true;
  const volume = opts.volume ?? 0.6;
  const fadeOutSeconds = opts.fadeOutSeconds ?? 1.5;
  const videoDuration = await probeDurationSeconds(videoPath);

  const audioFilters: string[] = [];
  if (loop) {
    audioFilters.push(`atrim=0:${videoDuration.toFixed(3)}`);
  } else {
    audioFilters.push('apad');
    audioFilters.push(`atrim=0:${videoDuration.toFixed(3)}`);
  }

  audioFilters.push('afade=t=in:st=0:d=0.5');
  if (fadeOutSeconds > 0 && videoDuration > fadeOutSeconds + 0.1) {
    const fadeOutStart = Math.max(videoDuration - fadeOutSeconds, 0);
    audioFilters.push(`afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeOutSeconds}`);
  }
  audioFilters.push(`volume=${volume}`);

  await new Promise<void>((resolve, reject) => {
    let cmd = ffmpeg().input(videoPath).input(audioPath);
    if (loop) {
      cmd = cmd.inputOptions(['-stream_loop', '-1']);
    }

    cmd
      .outputOptions([
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-filter_complex', `[1:a]${audioFilters.join(',')}[aud]`,
        '-map', '0:v',
        '-map', '[aud]',
        '-shortest',
      ])
      .output(outputPath)
      .on('start', (cmdline: string) => console.log('[ffmpeg audio]', cmdline))
      .on('stderr', (line: string) => console.log('[ffmpeg audio stderr]', line))
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run();
  });

  return outputPath;
}

/**
 * Extract and normalize spoken audio from a source video.
 */
export async function extractAudioTrack(
  videoPath: string,
  outputDir: string
): Promise<string> {
  const outputPath = path.join(outputDir, `voice_${uuid()}.mp3`);

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .noVideo()
      .outputOptions([
        '-vn',
        '-c:a', 'libmp3lame',
        '-ar', '44100',
        '-ac', '1',
        '-b:a', '192k',
      ])
      .output(outputPath)
      .on('start', (cmdline: string) => console.log('[ffmpeg extract-audio]', cmdline))
      .on('stderr', (line: string) => console.log('[ffmpeg extract-audio stderr]', line))
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run();
  });

  return outputPath;
}

/**
 * Clean and normalize a spoken-word track for clearer attorney narration.
 */
export async function cleanSpeechTrack(
  inputAudioPath: string,
  outputDir: string
): Promise<string> {
  const outputPath = path.join(outputDir, `voice_clean_${uuid()}.mp3`);

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(inputAudioPath)
      .outputOptions([
        '-vn',
        '-c:a', 'libmp3lame',
        '-ar', '44100',
        '-ac', '1',
        '-b:a', '192k',
        '-af',
        [
          'highpass=f=80',
          'lowpass=f=8000',
          'afftdn=nf=-22',
          'acompressor=threshold=-18dB:ratio=3:attack=5:release=80',
          'loudnorm=I=-16:TP=-1.5:LRA=11',
        ].join(','),
      ])
      .output(outputPath)
      .on('start', (cmdline: string) => console.log('[ffmpeg clean-speech]', cmdline))
      .on('stderr', (line: string) => console.log('[ffmpeg clean-speech stderr]', line))
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run();
  });

  return outputPath;
}
