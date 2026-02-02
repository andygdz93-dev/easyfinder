import { Routes, Route, Navigate } from "react-router-dom";
import Demo from "./pages/Demo";
import DemoListingDetail from "./pages/DemoListingDetail";

export default function App() {
  return (
    <Routes>
      {/* DEMO HOME */}
      <Route path="/demo" element={<Demo />} />

      {/* DEMO LISTING DETAIL */}
      <Route
        path="/demo/listings/:id"
        element={<DemoListingDetail />}
      />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/demo" replace />} />
    </Routes>
  );
}
