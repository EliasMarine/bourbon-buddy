"use client";

export function ReloadButton() {
  return (
    <button
      onClick={() => {
        window.location.reload();
      }}
      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
    >
      Reload Page
    </button>
  );
} 