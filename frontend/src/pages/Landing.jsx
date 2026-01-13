import { useState } from "react";
import NdaModal from "../components/NDAModal";

export default function Landing() {
  const [showNda, setShowNda] = useState(false);

  const handleAccept = () => {
    localStorage.setItem("ndaAccepted", "true");
    setShowNda(false);
    alert("Demo unlocked (next step: dashboard)");
  };

  return (
    <main className="flex flex-col items-center justify-center text-center px-6 py-20">
      <h2 className="text-4xl font-bold text-white mb-4">
        Find Buyers Before Your First Call
      </h2>

      <p className="text-gray-300 max-w-xl mb-8">
        EasyFinder AI automatically identifies, scores, and contacts your highest-value
        prospects so your sales team focuses only on deals that close.
      </p>

      <button
        onClick={() => setShowNda(true)}
        className="bg-brand-orange text-white px-8 py-3 rounded font-semibold text-lg"
      >
        Try Demo
      </button>

      {showNda && <NdaModal onAccept={handleAccept} />}
    </main>
  );
}
