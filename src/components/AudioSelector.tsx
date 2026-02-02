import { useState, useEffect, useRef } from 'react';

type AudioMode = 'none' | 'music' | 'narration';

interface AudioTrack {
  id: string;
  label: string;
  url: string;
  available: boolean;
}

interface Props {
  audioMode: AudioMode;
  selectedTrack: string | null;
  customAudioUrl: string | null;
  onModeChange: (mode: AudioMode) => void;
  onTrackSelect: (trackId: string | null) => void;
  onCustomAudioUpload: (url: string | null) => void;
}

export default function AudioSelector({
  audioMode,
  selectedTrack,
  customAudioUrl,
  onModeChange,
  onTrackSelect,
  onCustomAudioUpload,
}: Props) {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewTrack, setPreviewTrack] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('/api/audio-tracks')
      .then((r) => r.json())
      .then(setTracks)
      .catch(console.error);
  }, []);

  function handlePreview(url: string) {
    if (previewTrack === url) {
      audioRef.current?.pause();
      setPreviewTrack(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audio.volume = 0.5;
    void audio.play();
    audio.onended = () => setPreviewTrack(null);
    audioRef.current = audio;
    setPreviewTrack(url);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      onCustomAudioUpload(data.url);
    } catch (err) {
      console.error('Audio upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Audio</h2>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { id: 'none', label: 'Silent' },
          { id: 'music', label: 'Music' },
          { id: 'narration', label: 'Narration' },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onModeChange(opt.id as AudioMode)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              audioMode === opt.id
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {audioMode === 'none' && (
        <p className="text-sm text-gray-500">No audio will be added to the final reel.</p>
      )}

      {audioMode === 'music' && (
        <div className="space-y-2">
          {tracks
            .filter((t) => t.available)
            .map((track) => (
              <div
                key={track.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors cursor-pointer ${
                  selectedTrack === track.id && !customAudioUrl
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  onTrackSelect(track.id);
                  onCustomAudioUpload(null);
                }}
              >
                <span className="flex-1">{track.label}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(track.url);
                  }}
                  className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-600"
                >
                  {previewTrack === track.url ? 'Stop' : 'Preview'}
                </button>
              </div>
            ))}

          <div className="pt-2 pb-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              AI-Generated Music
            </span>
          </div>

          {[
            { id: 'ai-dramatic', label: 'AI: Dramatic / Tense' },
            { id: 'ai-hopeful', label: 'AI: Hopeful / Uplifting' },
            { id: 'ai-urgent', label: 'AI: Urgent / Fast-Paced' },
            { id: 'ai-corporate', label: 'AI: Corporate / Professional' },
          ].map((track) => (
            <div
              key={track.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors cursor-pointer ${
                selectedTrack === track.id && !customAudioUrl
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => {
                onTrackSelect(track.id);
                onCustomAudioUpload(null);
              }}
            >
              <span className="flex-1">{track.label}</span>
            </div>
          ))}

          <div
            className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
              customAudioUrl
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-700'
            }`}
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="flex-1">
                {customAudioUrl ? 'Custom music uploaded' : 'Upload your own music'}
              </span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
              <span className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-600">
                {uploading ? 'Uploading...' : 'Choose File'}
              </span>
            </label>
          </div>
        </div>
      )}

      {audioMode === 'narration' && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              onTrackSelect('narration-attorney-video');
              onCustomAudioUpload(null);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
              selectedTrack === 'narration-attorney-video' && !customAudioUrl
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Use uploaded attorney video voice (recommended)
          </button>

          {[
            { id: 'narration-female', label: 'Generate narration (female voice)' },
            { id: 'narration-male', label: 'Generate narration (male voice)' },
          ].map((voice) => (
            <button
              key={voice.id}
              type="button"
              onClick={() => {
                onTrackSelect(voice.id);
                onCustomAudioUpload(null);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                selectedTrack === voice.id && !customAudioUrl
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {voice.label}
            </button>
          ))}

          <div
            className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
              customAudioUrl
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-700'
            }`}
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="flex-1">
                {customAudioUrl
                  ? 'Custom narration uploaded'
                  : 'Upload recorded narration'}
              </span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
              <span className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-600">
                {uploading ? 'Uploading...' : 'Choose File'}
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
