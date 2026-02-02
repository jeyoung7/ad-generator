import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuid } from 'uuid';

const execFileAsync = promisify(execFile);

export type NarrationVoice = 'female' | 'male';

const SYSTEM_VOICE_BY_STYLE: Record<NarrationVoice, string> = {
  female: 'Samantha',
  male: 'Daniel',
};

/**
 * Generate a narration track using the local macOS `say` voice,
 * then transcode to mp3 so it can be mixed into the reel.
 */
export async function generateNarrationTrack(
  script: string,
  outputDir: string,
  voiceStyle: NarrationVoice = 'female'
): Promise<string> {
  const cleanedScript = script.replace(/\s+/g, ' ').trim();
  if (!cleanedScript) {
    throw new Error('Narration script is empty');
  }

  const aiffPath = path.join(outputDir, `narration_${uuid()}.aiff`);
  const mp3Path = path.join(outputDir, `narration_${uuid()}.mp3`);
  const voice = SYSTEM_VOICE_BY_STYLE[voiceStyle] || SYSTEM_VOICE_BY_STYLE.female;

  await execFileAsync('say', ['-v', voice, '-r', '170', '-o', aiffPath, cleanedScript]);

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(aiffPath)
        .outputOptions(['-vn', '-ar', '44100', '-ac', '2', '-b:a', '192k'])
        .output(mp3Path)
        .on('start', (cmdline: string) => console.log('[narration ffmpeg]', cmdline))
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });
  } finally {
    if (fs.existsSync(aiffPath)) fs.unlinkSync(aiffPath);
  }

  return mp3Path;
}
