import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Listings } from "./pages/Listings";
import { ListingDetail } from "./pages/ListingDetail";
import { Watchlist } from "./pages/Watchlist";
import { Layout } from "./components/Layout";

const App = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/listings" replace />} />
    <Route element={<Layout><Outlet /></Layout>}>
      <Route path="/listings" element={<Listings />} />
      <Route path="/listings/:id" element={<ListingDetail />} />
      <Route path="/watchlist" element={<Watchlist />} />
    </Route>
    <Route path="*" element={<Navigate to="/listings" replace />} />
  </Routes>
);

export default App;
