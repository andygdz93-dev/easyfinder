export default function NdaModal({ onAccept }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white text-black max-w-md p-6 rounded shadow-xl">
        <h2 className="text-xl font-bold mb-4">Non-Disclosure Agreement</h2>

        <p className="text-sm mb-4">
          This demo contains proprietary data and workflows. By proceeding, you agree
          not to disclose, copy, or distribute any part of this system.
        </p>

        <button
          onClick={onAccept}
          className="w-full bg-brand-orange text-white py-2 rounded font-semibold"
        >
          I Agree — Continue
        </button>
      </div>
    </div>
  );
}
