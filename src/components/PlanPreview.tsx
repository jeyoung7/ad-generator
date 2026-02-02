interface ScenePlan {
  clipIndex: number;
  duration: number;
  primitive: string;
  visualPrompt: string;
  textOverlay?: string;
  overlayPosition: string;
  ctaText?: string;
  showLogo: boolean;
  videoSource: string;
  transition: string;
}

interface AudioLayer {
  source: string;
  voiceId?: string;
  voiceName?: string;
  script?: string;
  musicMood?: string;
}

interface AdPlan {
  id: string;
  formatType: string;
  caseType: string;
  platform: string;
  audienceTemp: string;
  tone: string;
  clipStructure: number[];
  totalDuration: number;
  scenes: ScenePlan[];
  audio: AudioLayer;
  disclaimer: string;
  firmName?: string;
  phoneNumber?: string;
  locality?: string;
}

interface Props {
  plan: AdPlan;
  onApprove: () => void;
  onRegenerate: () => void;
  loading: boolean;
}

const PRIMITIVE_LABELS: Record<string, string> = {
  pattern_interrupt: 'Hook / Pattern Interrupt',
  pain_point: 'Pain Point',
  authority_proof: 'Authority / Proof',
  social_proof: 'Testimonial / Social Proof',
  attorney_direct: 'Attorney Direct',
  educational_tip: 'Educational Tip',
  comparison: 'Comparison',
  cta: 'Call to Action',
  urgency: 'Urgency',
};

const FORMAT_LABELS: Record<string, string> = {
  hook: 'Short-Form Hook',
  problem_solution: 'Problem → Solution',
  ugc: 'UGC / Testimonial',
  attorney_direct: 'Attorney Face-to-Camera',
  educational: 'Educational / Value-First',
  comparison: 'Comparison / Before-After',
  retargeting: 'Retargeting / Reminder',
  offer: 'Offer / Free Consultation',
  demo: 'How-It-Works',
  lifestyle: 'Lifestyle / Aspirational',
};

const AUDIO_LABELS: Record<string, string> = {
  grok: 'AI-Generated Voice (in video)',
  elevenlabs: 'ElevenLabs Narration',
  music_only: 'Background Music Only',
  silent: 'Silent (text overlay only)',
};

export default function PlanPreview({ plan, onApprove, onRegenerate, loading }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Ad Plan</h2>
        <div className="flex gap-2">
          <button
            onClick={onRegenerate}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Regenerate Plan
          </button>
        </div>
      </div>

      {/* Plan Summary */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        <div className="px-3 py-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500">Format</div>
          <div className="font-medium">{FORMAT_LABELS[plan.formatType] || plan.formatType}</div>
        </div>
        <div className="px-3 py-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500">Duration</div>
          <div className="font-medium">{plan.totalDuration}s ({plan.clipStructure.join(' + ')}s)</div>
        </div>
        <div className="px-3 py-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500">Tone</div>
          <div className="font-medium capitalize">{plan.tone}</div>
        </div>
        <div className="px-3 py-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500">Audio</div>
          <div className="font-medium">{AUDIO_LABELS[plan.audio.source] || plan.audio.source}</div>
        </div>
      </div>

      {/* Voice Info */}
      {plan.audio.voiceName && (
        <div className="mb-4 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm">
          <span className="text-purple-600 font-medium">Voice:</span>{' '}
          <span className="text-purple-800">{plan.audio.voiceName}</span>
        </div>
      )}

      {/* Scenes */}
      <div className="space-y-3 mb-4">
        {plan.scenes.map((scene, i) => (
          <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {scene.duration}s
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {PRIMITIVE_LABELS[scene.primitive] || scene.primitive}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                Clip {i + 1} / {scene.videoSource}
              </span>
            </div>

            {scene.textOverlay && (
              <div className="mb-2">
                <div className="text-xs text-gray-500 mb-0.5">On-screen text</div>
                <div className="text-sm font-semibold text-gray-900 bg-white px-2 py-1 rounded border">
                  {scene.textOverlay}
                </div>
              </div>
            )}

            {scene.ctaText && (
              <div className="mb-2">
                <div className="text-xs text-gray-500 mb-0.5">CTA</div>
                <div className="text-sm font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                  {scene.ctaText}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs text-gray-500 mb-0.5">Visual prompt</div>
              <div className="text-xs text-gray-600 line-clamp-2">{scene.visualPrompt}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Narration Script */}
      {plan.audio.script && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs font-medium text-blue-600 mb-1">Narration Script</div>
          <div className="text-sm text-blue-900 leading-relaxed">{plan.audio.script}</div>
        </div>
      )}

      {/* Approve / Generate */}
      <button
        onClick={onApprove}
        disabled={loading}
        className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
          loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating Video...
          </span>
        ) : (
          'Generate Video from Plan'
        )}
      </button>
    </div>
  );
}
