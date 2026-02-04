import { Routes, Route, Navigate } from "react-router-dom";
import Demo from "./pages/Demo";
import DemoListingDetail from "./pages/DemoListingDetail";
import { DemoWatchlist } from "./pages/DemoWatchlist";

export default function App() {
  return (
    <Routes>
      {/* DEMO HOME */}
      <Route path="/demo" element={<Demo />} />
      <Route path="/demo/watchlist" element={<DemoWatchlist />} />

      {/* DEMO LISTING DETAIL */}
      <Route path="/demo/:id" element={<DemoListingDetail />} />
      <Route path="/demo/listings/:id" element={<DemoListingDetail />} />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/demo" replace />} />
    </Routes>
  );
}
