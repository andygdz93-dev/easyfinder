import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Listings } from "./pages/Listings";
import { ListingDetail } from "./pages/ListingDetail";
import { Watchlist } from "./pages/Watchlist";
import { Demo } from "./pages/Demo";
import { DemoListingDetail } from "./pages/DemoListingDetail";
import { DemoWatchlist } from "./pages/DemoWatchlist";
import { Layout } from "./components/Layout";
import { DemoLayout } from "./components/DemoLayout";

const App = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/listings" replace />} />
    <Route element={<Layout><Outlet /></Layout>}>
      <Route path="/listings" element={<Listings />} />
      <Route path="/listings/:id" element={<ListingDetail />} />
      <Route path="/watchlist" element={<Watchlist />} />
    </Route>
    <Route element={<DemoLayout><Outlet /></DemoLayout>}>
      <Route path="/demo" element={<Demo />} />
      <Route path="/demo/listings/:id" element={<DemoListingDetail />} />
      <Route path="/demo/watchlist" element={<DemoWatchlist />} />
    </Route>
    <Route path="*" element={<Navigate to="/listings" replace />} />
  </Routes>
);

export default App;
