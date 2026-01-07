import React, { useState } from "react";
import Header from "./components/Header";
import NDAModal from "./components/NDAModal";
import Hero from "./components/Hero";
import ScoreLead from "./pages/ScoreLead";
import ScoresList from "./pages/ScoresList";
import GeneratedOutreach from "./pages/GeneratedOutreach";

export default function App() {
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [variant, setVariant] = useState("EasyFinder AI (Core)");
  const [page, setPage] = useState("hero"); // hero | score | scores | outreach

  const renderPage = () => {
    if (!ndaAccepted) return null;

    switch (page) {
      case "score":
        return <ScoreLead variant={variant} />;
      case "scores":
        return <ScoresList />;
      case "outreach":
        return <GeneratedOutreach />;
      default:
        return <Hero variant={variant} />;
    }
  };

  return (
    <div className="min-h-screen">
      <Header variant={variant} setVariant={setVariant} />
      <NDAModal show={!ndaAccepted} onAccept={() => setNdaAccepted(true)} />
      <div className="container mx-auto">{renderPage()}</div>
      {ndaAccepted && (
        <nav className="fixed bottom-0 left-0 w-full bg-gray-200 p-4 flex justify-center gap-4">
          <button onClick={() => setPage("score")} className="px-3 py-1 rounded bg-blue-900 text-white hover:bg-blue-800">Score Lead</button>
          <button onClick={() => setPage("scores")} className="px-3 py-1 rounded bg-blue-900 text-white hover:bg-blue-800">Past Scores</button>
          <button onClick={() => setPage("outreach")} className="px-3 py-1 rounded bg-blue-900 text-white hover:bg-blue-800">Generated Outreach</button>
          <button onClick={() => setPage("hero")} className="px-3 py-1 rounded bg-gray-400 text-white hover:bg-gray-500">Home</button>
        </nav>
      )}
    </div>
  );
}
