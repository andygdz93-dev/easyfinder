import React from "react";

export default function NDAModal({ show, onAccept }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full text-center shadow-lg">
        <h2 className="text-xl font-bold mb-4">Non-Disclosure Agreement Required</h2>
        <p className="mb-6">
          You must accept the NDA to access EasyFinder AI demo.
        </p>
        <button
          onClick={onAccept}
          className="bg-blue-900 text-white px-4 py-2 rounded mr-2 hover:bg-blue-800"
        >
          Accept NDA
        </button>
        <button
          onClick={() => alert("Demo access denied")}
          className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
