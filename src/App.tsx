import { useState } from 'react';
import AdConfigurator from './components/AdConfigurator';
import PlanPreview from './components/PlanPreview';
import LogoUpload from './components/LogoUpload';
import MediaUpload from './components/MediaUpload';
import VideoPreview from './components/VideoPreview';

type Platform = 'tiktok' | 'instagram' | 'facebook';
type AudienceTemp = 'cold' | 'warm' | 'hot';

interface AdPlan {
  id: string;
  formatType: string;
  caseType: string;
  platform: string;
  audienceTemp: string;
  tone: string;
  clipStructure: number[];
  totalDuration: number;
  scenes: any[];
  audio: any;
  disclaimer: string;
  firmName?: string;
  phoneNumber?: string;
  locality?: string;
}

type Step = 'configure' | 'plan' | 'generate';

export default function App() {
  // Config state
  const [caseType, setCaseType] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [audienceTemp, setAudienceTemp] = useState<AudienceTemp>('cold');
  const [formatType, setFormatType] = useState<string | null>(null);
  const [firmName, setFirmName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [locality, setLocality] = useState('');

  // Assets
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selfieUrls, setSelfieUrls] = useState<string[]>([]);

  // Plan & generation state
  const [plan, setPlan] = useState<AdPlan | null>(null);
  const [step, setStep] = useState<Step>('configure');
  const [planning, setPlanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sceneUrls, setSceneUrls] = useState<string[]>([]);

  async function handleCreatePlan() {
    if (!caseType) return;
    setPlanning(true);
    setError(null);
    setPlan(null);
    setVideoUrl(null);
    setSceneUrls([]);
    setStatusMessage('Creating ad plan with AI...');

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseType,
          platform,
          audienceTemp,
          formatType: formatType || undefined,
          firmName: firmName || undefined,
          phoneNumber: phoneNumber || undefined,
          locality: locality || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Plan generation failed' }));
        throw new Error(err.error || 'Plan generation failed');
      }

      const generatedPlan = await res.json();
      setPlan(generatedPlan);
      setStep('plan');
    } catch (err) {
      setError(String(err));
    } finally {
      setPlanning(false);
      setStatusMessage(null);
    }
  }

  async function handleGenerateFromPlan() {
    if (!plan) return;
    setGenerating(true);
    setError(null);
    setVideoUrl(null);
    setSceneUrls([]);
    setStep('generate');

    try {
      const res = await fetch('/api/generate-from-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          logoUrl: logoUrl || undefined,
          selfieUrl: selfieUrls[0] || undefined,
          selfieUrls,
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

          if (event.type === 'status') {
            setStatusMessage(event.message);
          } else if (event.type === 'scene') {
            setSceneUrls((prev) => {
              const next = [...prev];
              next[event.index] = event.url;
              return next;
            });
            setStatusMessage(`Scene ${event.index + 1} complete (${event.duration}s ${event.primitive})`);
          } else if (event.type === 'complete') {
            setVideoUrl(event.url);
            setStatusMessage(null);
          } else if (event.type === 'error') {
            setError(event.details || 'Generation failed');
            setStatusMessage(null);
          }
        }
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setGenerating(false);
    }
  }

  function handleBackToConfigure() {
    setStep('configure');
    setPlan(null);
    setVideoUrl(null);
    setSceneUrls([]);
    setError(null);
    setStatusMessage(null);
  }

  function handleBackToPlan() {
    setStep('plan');
    setVideoUrl(null);
    setSceneUrls([]);
    setError(null);
    setStatusMessage(null);
  }

  const canPlan = !!caseType;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Ad Generator</h1>
          <p className="text-sm text-gray-500">AI-Powered Personal Injury Video Ads</p>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {(['configure', 'plan', 'generate'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px bg-gray-300" />}
                <div
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                    step === s
                      ? 'bg-blue-100 text-blue-700'
                      : (['configure', 'plan', 'generate'] as const).indexOf(step) > i
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                    {i + 1}
                  </span>
                  {s === 'configure' ? 'Configure' : s === 'plan' ? 'Review Plan' : 'Generate'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {step === 'configure' && (
              <>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <AdConfigurator
                    caseType={caseType}
                    platform={platform}
                    audienceTemp={audienceTemp}
                    formatType={formatType}
                    firmName={firmName}
                    phoneNumber={phoneNumber}
                    locality={locality}
                    onCaseTypeChange={setCaseType}
                    onPlatformChange={setPlatform}
                    onAudienceTempChange={setAudienceTemp}
                    onFormatTypeChange={setFormatType}
                    onFirmNameChange={setFirmName}
                    onPhoneChange={setPhoneNumber}
                    onLocalityChange={setLocality}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <LogoUpload logoUrl={logoUrl} onUpload={setLogoUrl} />
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <MediaUpload selfieUrls={selfieUrls} onUpload={setSelfieUrls} />
                  </div>
                </div>

                <button
                  onClick={handleCreatePlan}
                  disabled={!canPlan || planning}
                  className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
                    !canPlan || planning
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {planning ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating Ad Plan...
                    </span>
                  ) : (
                    'Create Ad Plan with AI'
                  )}
                </button>
              </>
            )}

            {step === 'plan' && plan && (
              <>
                <button
                  onClick={handleBackToConfigure}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  &larr; Back to configuration
                </button>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <PlanPreview
                    plan={plan}
                    onApprove={handleGenerateFromPlan}
                    onRegenerate={handleCreatePlan}
                    loading={generating}
                  />
                </div>
              </>
            )}

            {step === 'generate' && (
              <>
                <button
                  onClick={handleBackToPlan}
                  disabled={generating}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 disabled:opacity-50"
                >
                  &larr; Back to plan
                </button>

                {statusMessage && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 flex items-center gap-2">
                    {generating && (
                      <svg className="animate-spin h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {statusMessage}
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right column - Preview */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
              {videoUrl || sceneUrls.length > 0 ? (
                <VideoPreview
                  videoUrl={videoUrl}
                  sceneUrls={sceneUrls}
                  layout="portrait"
                />
              ) : plan ? (
                <div className="text-center py-12 text-gray-400">
                  <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Plan ready. Click "Generate Video" to create your ad.</p>
                  <div className="mt-4 text-xs text-gray-400">
                    <div>{plan.scenes.length} scenes</div>
                    <div>{plan.totalDuration}s total</div>
                    <div className="capitalize">{plan.audio.source} audio</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-gray-400">
                  <svg className="mx-auto h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p>Configure your ad and create a plan to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
