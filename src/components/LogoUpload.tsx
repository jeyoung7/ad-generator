import { useRef } from 'react';

interface Props {
  logoUrl: string | null;
  onUpload: (url: string) => void;
}

export default function LogoUpload({ logoUrl, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    const data = await res.json();
    onUpload(data.url);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Brand Logo</h2>
      <p className="text-sm text-gray-500 mb-3">
        Logo appears on every scene and is emphasized on the final CTA scene.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />

      {logoUrl ? (
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="Logo"
            className="h-16 w-16 object-contain rounded border border-gray-200 bg-white p-1"
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="text-sm text-blue-600 hover:underline"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          Upload Logo (PNG/JPG)
        </button>
      )}
    </div>
  );
}
