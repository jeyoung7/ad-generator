interface Props {
  videoUrl: string | null;
  sceneUrls: string[];
  layout: 'portrait' | 'square' | 'landscape';
}

export default function VideoPreview({ videoUrl, sceneUrls, layout }: Props) {
  const completedScenes = sceneUrls.filter(Boolean);
  const previewAspect =
    layout === 'landscape' ? '16/9' : layout === 'square' ? '1/1' : '9/16';

  if (!videoUrl && completedScenes.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Preview</h2>

      {videoUrl && (
        <>
          <div className="bg-black rounded-lg overflow-hidden mb-4">
            <video
              src={videoUrl}
              controls
              className="w-full max-h-[600px] mx-auto"
              style={{ aspectRatio: previewAspect }}
            />
          </div>

          <a
            href={videoUrl}
            download="ad_reel.mp4"
            className="block w-full text-center py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            Download Final Reel
          </a>
        </>
      )}

      {!videoUrl && completedScenes.length > 0 && (
        <p className="text-sm text-gray-500 mb-3">
          Generating scenes... {completedScenes.length} completed
        </p>
      )}

      {completedScenes.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            Individual Scenes
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {completedScenes.map((url, i) => (
              <div key={url} className="bg-black rounded overflow-hidden">
                <video
                  src={url}
                  controls
                  className="w-full"
                  style={{ aspectRatio: previewAspect }}
                />
                <div className="text-xs text-gray-400 p-1 text-center">
                  Scene {i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
