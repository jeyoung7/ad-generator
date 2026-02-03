import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';

const execFileAsync = promisify(execFile);

export type CaptionStyle = 'impact' | 'clean' | 'kinetic';

export interface RemotionCaptionOptions {
  inputVideoPath: string;
  outputDir: string;
  style?: CaptionStyle;
  projectDir: string;
  entityName?: string;
}

function readPackageJsonScripts(projectDir: string): Record<string, string> {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return {};
  try {
    const raw = fs.readFileSync(pkgPath, 'utf8');
    const parsed = JSON.parse(raw) as { scripts?: Record<string, string> };
    return parsed.scripts || {};
  } catch {
    return {};
  }
}

function ensureRemotionProject(projectDir: string): void {
  if (!fs.existsSync(projectDir)) {
    throw new Error(
      `Remotion project not found at ${projectDir}. Set REMOTION_TIKTOK_DIR to your template-tiktok directory.`
    );
  }
}

export async function applyRemotionWordCaptions(
  opts: RemotionCaptionOptions
): Promise<string> {
  ensureRemotionProject(opts.projectDir);

  const scripts = readPackageJsonScripts(opts.projectDir);
  if (!scripts['caption:video']) {
    throw new Error(
      `Missing "caption:video" script in ${opts.projectDir}/package.json. ` +
        'Add a script that accepts --input, --output, and --style.'
    );
  }

  const outputPath = path.join(opts.outputDir, 'final_reel_captioned.mp4');

  await execFileAsync(
    'npm',
    (() => {
      const baseArgs = [
      '--prefix',
      opts.projectDir,
      'run',
      'caption:video',
      '--',
      '--input',
      opts.inputVideoPath,
      '--output',
      outputPath,
      '--style',
      opts.style || 'impact',
      ];
      if (opts.entityName?.trim()) {
        baseArgs.push('--entity', opts.entityName.trim());
      }
      return baseArgs;
    })(),
    { maxBuffer: 1024 * 1024 * 50, timeout: 10 * 60 * 1000 }
  );

  if (!fs.existsSync(outputPath)) {
    throw new Error(`Remotion did not produce output video at ${outputPath}`);
  }

  return outputPath;
}
