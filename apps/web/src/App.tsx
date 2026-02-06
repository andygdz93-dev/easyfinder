import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { Landing } from "./pages/Landing";
import { Listings } from "./pages/app/Listings";
import { ListingDetail } from "./pages/app/ListingDetail";
import { Watchlist } from "./pages/app/Watchlist";
import { AdminSources } from "./pages/app/AdminSources";
import { ScoringConfigs } from "./pages/app/ScoringConfigs";
import { SellerDashboard } from "./pages/app/SellerDashboard";
import { Upgrade } from "./pages/app/Upgrade";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { NdaGate } from "./pages/NdaGate";
import DemoListings from "./pages/demo/Listings";
import DemoListingDetail from "./pages/demo/ListingDetail";
import { DemoWatchlist } from "./pages/demo/Watchlist";
import { DemoLayout } from "./layouts/DemoLayout";
import { LiveLayout } from "./layouts/LiveLayout";
import { RequireNda } from "./components/RequireNda";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/app/login" element={<Login />} />
      <Route path="/app/register" element={<Register />} />
      <Route path="/nda" element={<NdaGate />} />

      <Route
        path="/app/*"
        element={
          <RequireAuth>
            <LiveLayout>
              <Outlet />
            </LiveLayout>
          </RequireAuth>
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

      <Route
        path="/demo/*"
        element={
          <RequireNda>
            <DemoLayout>
              <Outlet />
            </DemoLayout>
          </RequireNda>
        }
      >
        <Route index element={<Navigate to="listings" replace />} />
        <Route path="listings" element={<DemoListings />} />
        <Route path="listings/:id" element={<DemoListingDetail />} />
        <Route path="watchlist" element={<DemoWatchlist />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
