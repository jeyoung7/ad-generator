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

interface Props {
  scenes: Scene[];
  overrides: Record<number, { text?: string; cta?: string }>;
  phoneNumber: string;
  locality: string;
  onOverrideChange: (
    index: number,
    field: 'text' | 'cta',
    value: string
  ) => void;
  onPhoneChange: (phone: string) => void;
  onLocalityChange: (locality: string) => void;
}

function previewText(text: string, locality: string): string {
  return text.replace(/\{city\}/g, locality || '{city}');
}

export default function OverlayEditor({
  scenes,
  overrides,
  phoneNumber,
  locality,
  onOverrideChange,
  onPhoneChange,
  onLocalityChange,
}: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Edit Overlays</h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
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

      <div className="space-y-4">
        {scenes.map((scene, i) => (
          <div key={i} className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-600 mb-2">
              Scene {i + 1} — {scene.source} ({scene.duration}s)
            </div>

            {scene.overlay.text !== undefined && (
              <div className="mb-2">
                <label className="block text-xs text-gray-500 mb-1">
                  Headline
                </label>
                <input
                  type="text"
                  value={previewText(
                    overrides[i]?.text ?? scene.overlay.text,
                    locality
                  )}
                  onChange={(e) => onOverrideChange(i, 'text', e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {scene.overlay.cta !== undefined && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">CTA</label>
                <input
                  type="text"
                  value={overrides[i]?.cta ?? scene.overlay.cta}
                  onChange={(e) => onOverrideChange(i, 'cta', e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
