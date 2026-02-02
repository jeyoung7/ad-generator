import { useRef, useState } from 'react';

interface Props {
  selfieUrls: string[];
  onUpload: (urls: string[]) => void;
}

function isVideo(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)$/i.test(url);
}

export default function MediaUpload({ selfieUrls, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadSingle(file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }
    const data = await res.json();
    return data.url as string;
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploaded = await Promise.all(Array.from(files).map(uploadSingle));
      const merged = Array.from(new Set([...selfieUrls, ...uploaded]));
      onUpload(merged);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function removeAt(index: number) {
    onUpload(selfieUrls.filter((_, i) => i !== index));
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Attorney Photos / Video</h2>
      <p className="text-sm text-gray-500 mb-3">
        Upload photos for identity consistency and one talking-head video if you want that same real voice used across the full ad.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleUpload(e.target.files);
        }}
      />

      {selfieUrls.length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {selfieUrls.map((url, i) => (
              <div key={url} className="relative rounded border border-gray-200 overflow-hidden">
                {isVideo(url) ? (
                  <video src={url} className="h-24 w-full object-cover" muted />
                ) : (
                  <img src={url} alt={`Attorney reference ${i + 1}`} className="h-24 w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white text-xs"
                  aria-label={`Remove reference ${i + 1}`}
                >
                  x
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-sm text-blue-600 hover:underline disabled:text-gray-400"
          >
            {uploading ? 'Uploading...' : 'Add more references'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-60"
        >
          {uploading ? 'Uploading...' : 'Upload Attorney References'}
        </button>
      )}
    </div>
  );
}
