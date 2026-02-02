import { useState, useEffect } from 'react';
import TemplateSelector from './components/TemplateSelector';
import OverlayEditor from './components/OverlayEditor';
import LogoUpload from './components/LogoUpload';
import MediaUpload from './components/MediaUpload';
import AudioSelector from './components/AudioSelector';
import VideoPreview from './components/VideoPreview';
import GenerateButton from './components/GenerateButton';

type VideoLayout = 'portrait' | 'square' | 'landscape';
type AudioMode = 'none' | 'music' | 'narration';

interface Scene {
  prompt: string;
  duration: number;
  source: string;
  overlay: {
    text?: string;
    position: string;
    cta?: string;
    showLogo?: boolean;
  };
}

interface FullTemplate {
  caseType: string;
  storyline: string;
  scenes: Scene[];
  disclaimer: string;
}

export default function App() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [template, setTemplate] = useState<FullTemplate | null>(null);
  const [overrides, setOverrides] = useState<
    Record<number, { text?: string; cta?: string }>
  >({});
  const [phoneNumber, setPhoneNumber] = useState('');
  const [locality, setLocality] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selfieUrls, setSelfieUrls] = useState<string[]>([]);
  const [layout, setLayout] = useState<VideoLayout>('portrait');
  const [audioMode, setAudioMode] = useState<AudioMode>('music');
  const [audioTrack, setAudioTrack] = useState<string | null>(null);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sceneUrls, setSceneUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedTemplate) {
      setTemplate(null);
      return;
    }
    fetch(`/api/templates/${selectedTemplate}`)
      .then((r) => r.json())
      .then((t) => {
        setTemplate(t);
        setOverrides({});
        setVideoUrl(null);
        setSceneUrls([]);
      })
      .catch(console.error);
  }, [selectedTemplate]);

  function handleOverrideChange(
    index: number,
    field: 'text' | 'cta',
    value: string
  ) {
    setOverrides((prev) => ({
      ...prev,
      [index]: { ...prev[index], [field]: value },
    }));
  }

  function handleAudioModeChange(mode: AudioMode) {
    setAudioMode(mode);

    if (mode === 'none') {
      setAudioTrack(null);
      setCustomAudioUrl(null);
      return;
    }

    if (mode === 'music') {
      if (audioTrack?.startsWith('narration-')) {
        setAudioTrack(null);
      }
      return;
    }

    if (!audioTrack?.startsWith('narration-')) {
      setAudioTrack('narration-attorney-video');
    }
  }

  async function handleGenerate() {
    if (!selectedTemplate) return;
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setSceneUrls([]);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseType: selectedTemplate,
          overrides,
          logoUrl,
          selfieUrl: selfieUrls[0] ?? undefined,
          selfieUrls,
          phoneNumber,
          locality,
          layout,
          audioMode,
          audioTrack: audioTrack ?? undefined,
          audioUrl: customAudioUrl ?? undefined,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        try {
          const err = JSON.parse(text);
          throw new Error(err.details || err.error || 'Generation failed');
        } catch {
          throw new Error(text || 'Generation failed');
        }
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6);
          if (!json) continue;

          const event = JSON.parse(json);

          if (event.type === 'scene') {
            setSceneUrls((prev) => {
              const next = [...prev];
              next[event.index] = event.url;
              return next;
            });
          } else if (event.type === 'complete') {
            setVideoUrl(event.url);
            setLoading(false);
          } else if (event.type === 'error') {
            setError(event.details || 'Generation failed');
            setLoading(false);
          }
        }
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Ad Generator</h1>
          <p className="text-sm text-gray-500">Personal Injury Video Ads with AI</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <TemplateSelector
                selected={selectedTemplate}
                onSelect={setSelectedTemplate}
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-3">Ad Layout</h2>
              <p className="text-sm text-gray-500 mb-3">
                Choose the output frame for Reels, feed posts, or landscape placements.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'portrait', label: 'Portrait 9:16' },
                  { id: 'square', label: 'Square 1:1' },
                  { id: 'landscape', label: 'Landscape 16:9' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLayout(option.id as VideoLayout)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      layout === option.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {template && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <OverlayEditor
                  scenes={template.scenes}
                  overrides={overrides}
                  phoneNumber={phoneNumber}
                  locality={locality}
                  onOverrideChange={handleOverrideChange}
                  onPhoneChange={setPhoneNumber}
                  onLocalityChange={setLocality}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <LogoUpload logoUrl={logoUrl} onUpload={setLogoUrl} />
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <MediaUpload selfieUrls={selfieUrls} onUpload={setSelfieUrls} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <AudioSelector
                audioMode={audioMode}
                selectedTrack={audioTrack}
                customAudioUrl={customAudioUrl}
                onModeChange={handleAudioModeChange}
                onTrackSelect={setAudioTrack}
                onCustomAudioUpload={setCustomAudioUrl}
              />
            </div>

            <GenerateButton
              disabled={!selectedTemplate}
              loading={loading}
              onClick={handleGenerate}
            />

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
              {videoUrl || sceneUrls.length > 0 ? (
                <VideoPreview
                  videoUrl={videoUrl}
                  sceneUrls={sceneUrls}
                  layout={layout}
                />
              ) : (
                <div className="text-center py-20 text-gray-400">
                  <svg
                    className="mx-auto h-16 w-16 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <p>Select a template and click Generate to preview your ad</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
