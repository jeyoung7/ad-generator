import { useEffect, useState } from 'react';

interface TemplateSummary {
  caseType: string;
  storyline: string;
  sceneCount: number;
}

interface Props {
  selected: string | null;
  onSelect: (caseType: string) => void;
}

export default function TemplateSelector({ selected, onSelect }: Props) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);

  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then(setTemplates)
      .catch(console.error);
  }, []);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Case Type</h2>
      <div className="grid gap-3">
        {templates.map((t) => (
          <button
            key={t.caseType}
            onClick={() => onSelect(t.caseType)}
            className={`text-left p-4 rounded-lg border-2 transition-colors ${
              selected === t.caseType
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-400 bg-white'
            }`}
          >
            <div className="font-medium text-gray-900">{t.storyline}</div>
            <div className="text-sm text-gray-500 mt-1">
              {t.sceneCount} scenes
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
