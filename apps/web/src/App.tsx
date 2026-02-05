import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import Demo from "./pages/Demo";
import DemoListingDetail from "./pages/DemoListingDetail";
import { DemoWatchlist } from "./pages/DemoWatchlist";
import { Landing } from "./pages/Landing";
import { Listings } from "./pages/Listings";
import { ListingDetail } from "./pages/ListingDetail";
import { Watchlist } from "./pages/Watchlist";
import { AdminSources } from "./pages/AdminSources";
import { ScoringConfigs } from "./pages/ScoringConfigs";
import { SellerDashboard } from "./pages/SellerDashboard";
import { Upgrade } from "./pages/Upgrade";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/app"
        element={
          <AppShell>
            <Outlet />
          </AppShell>
        }
      >
        <Route index element={<Navigate to="listings" replace />} />
        <Route path="listings" element={<Listings />} />
        <Route path="listings/:id" element={<ListingDetail />} />
        <Route path="watchlist" element={<Watchlist />} />
        <Route path="admin/sources" element={<AdminSources />} />
        <Route path="scoring" element={<ScoringConfigs />} />
        <Route path="seller" element={<SellerDashboard />} />
        <Route path="upgrade" element={<Upgrade />} />
      </Route>

      <Route path="/demo" element={<Demo />} />
      <Route path="/demo/watchlist" element={<DemoWatchlist />} />
      <Route path="/demo/:id" element={<DemoListingDetail />} />
      <Route path="/demo/listings/:id" element={<DemoListingDetail />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
