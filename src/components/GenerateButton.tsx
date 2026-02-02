interface Props {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

export default function GenerateButton({ disabled, loading, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
        disabled || loading
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="animate-spin h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Generating Ad...
        </span>
      ) : (
        'Generate Ad Reel'
      )}
    </button>
  );
}
