import { useEffect, useState } from 'react';

type Platform = 'tiktok' | 'instagram' | 'facebook';
type AudienceTemp = 'cold' | 'warm' | 'hot';

interface FormatOption {
  formatType: string;
  label: string;
  description: string;
  piTier: number;
}

interface Props {
  caseType: string | null;
  platform: Platform;
  audienceTemp: AudienceTemp;
  formatType: string | null;
  firmName: string;
  phoneNumber: string;
  locality: string;
  onCaseTypeChange: (ct: string) => void;
  onPlatformChange: (p: Platform) => void;
  onAudienceTempChange: (t: AudienceTemp) => void;
  onFormatTypeChange: (f: string | null) => void;
  onFirmNameChange: (n: string) => void;
  onPhoneChange: (p: string) => void;
  onLocalityChange: (l: string) => void;
}

const CASE_TYPES = [
  { id: 'car-accident', label: 'Car Accident' },
  { id: 'truck-accident', label: 'Truck Accident' },
  { id: 'slip-and-fall', label: 'Slip & Fall' },
  { id: 'medical-malpractice', label: 'Medical Malpractice' },
  { id: 'wrongful-death', label: 'Wrongful Death' },
  { id: 'workplace-injury', label: 'Workplace Injury' },
  { id: 'dog-bite', label: 'Dog Bite' },
  { id: 'rideshare-accident', label: 'Rideshare Accident' },
];

const PLATFORMS: { id: Platform; label: string; desc: string }[] = [
  { id: 'tiktok', label: 'TikTok', desc: '5–15s, raw, hook-first' },
  { id: 'instagram', label: 'Instagram Reels', desc: '15–20s, polished' },
  { id: 'facebook', label: 'Facebook', desc: '15–25s, direct, older demo' },
];

const AUDIENCE_TEMPS: { id: AudienceTemp; label: string; desc: string }[] = [
  { id: 'cold', label: 'Cold', desc: 'Never heard of the firm' },
  { id: 'warm', label: 'Warm', desc: 'Some awareness' },
  { id: 'hot', label: 'Hot', desc: 'Visited site, ready to convert' },
];

export default function AdConfigurator({
  caseType,
  platform,
  audienceTemp,
  formatType,
  firmName,
  phoneNumber,
  locality,
  onCaseTypeChange,
  onPlatformChange,
  onAudienceTempChange,
  onFormatTypeChange,
  onFirmNameChange,
  onPhoneChange,
  onLocalityChange,
}: Props) {
  const [formats, setFormats] = useState<FormatOption[]>([]);

  useEffect(() => {
    fetch('/api/formats')
      .then((r) => r.json())
      .then(setFormats)
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      {/* Case Type */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Case Type</h2>
        <div className="grid grid-cols-2 gap-2">
          {CASE_TYPES.map((ct) => (
            <button
              key={ct.id}
              onClick={() => onCaseTypeChange(ct.id)}
              className={`text-left px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                caseType === ct.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Platform</h2>
        <div className="grid grid-cols-3 gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => onPlatformChange(p.id)}
              className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                platform === p.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="font-medium">{p.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Audience Temperature */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Audience</h2>
        <div className="grid grid-cols-3 gap-2">
          {AUDIENCE_TEMPS.map((t) => (
            <button
              key={t.id}
              onClick={() => onAudienceTempChange(t.id)}
              className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                audienceTemp === t.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="font-medium">{t.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Format Override (optional) */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Ad Format</h2>
        <p className="text-xs text-gray-500 mb-2">
          Optional — AI picks the best format if left on Auto.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onFormatTypeChange(null)}
            className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
              formatType === null
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-700 hover:border-gray-400'
            }`}
          >
            <div className="font-medium">Auto (AI Picks)</div>
            <div className="text-xs text-gray-500 mt-0.5">Recommended</div>
          </button>
          {formats
            .filter((f) => f.piTier <= 2)
            .map((f) => (
              <button
                key={f.formatType}
                onClick={() => onFormatTypeChange(f.formatType)}
                className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  formatType === f.formatType
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">{f.label}</div>
                <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {f.description}
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* Firm Details */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Firm Details</h2>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Firm Name
            </label>
            <input
              type="text"
              value={firmName}
              onChange={(e) => onFirmNameChange(e.target.value)}
              placeholder="Thomas J. Henry Law"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City / State
              </label>
              <input
                type="text"
                value={locality}
                onChange={(e) => onLocalityChange(e.target.value)}
                placeholder="Houston, TX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
