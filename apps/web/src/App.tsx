import { Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { RequireEnterprise } from "./components/RequireEnterprise";
import { RequireLiveNda } from "./components/RequireLiveNda";
import { Landing } from "./pages/Landing";
import { Listings } from "./pages/app/Listings";
import { ListingDetail } from "./pages/app/ListingDetail";
import { Watchlist } from "./pages/app/Watchlist";
import { AdminSources } from "./pages/app/AdminSources";
import { ScoringConfigs } from "./pages/app/ScoringConfigs";
import { Offers } from "./pages/app/Offers";
import { SellerListings } from "./pages/app/SellerListings";
import { SellerAdd } from "./pages/app/SellerAdd";
import { SellerUpload } from "./pages/app/SellerUpload";
import { Settings } from "./pages/app/Settings";
import { Upgrade } from "./pages/app/Upgrade";
import { Nda } from "./pages/app/Nda";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { DemoTour } from "./pages/demo/Tour";
import { DemoLayout } from "./layouts/DemoLayout";
import { LiveLayout } from "./layouts/LiveLayout";
import { NdaProvider } from "./lib/nda";

const LegacyListingRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/app/listings/${id ?? ""}`} replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/app/login" element={<Login />} />
      <Route path="/app/register" element={<Register />} />
      <Route path="/listings" element={<Navigate to="/app/listings" replace />} />
      <Route path="/listings/:id" element={<LegacyListingRedirect />} />
      <Route path="/watchlist" element={<Navigate to="/app/watchlist" replace />} />
      <Route path="/admin/sources" element={<Navigate to="/app/admin/sources" replace />} />
      <Route path="/scoring" element={<Navigate to="/app/scoring" replace />} />
      <Route path="/seller" element={<Navigate to="/app/seller/listings" replace />} />
      <Route path="/upgrade" element={<Navigate to="/app/upgrade" replace />} />
      <Route path="/nda" element={<Navigate to="/app/nda" replace />} />

      <Route
        path="/app/*"
        element={
          <RequireAuth>
            <NdaProvider>
              <LiveLayout>
                <RequireLiveNda />
              </LiveLayout>
            </NdaProvider>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="listings" replace />} />
        <Route path="listings" element={<Listings />} />
        <Route path="listings/:id" element={<ListingDetail />} />
        <Route path="watchlist" element={<Watchlist />} />
        <Route path="admin/sources" element={<AdminSources />} />
        <Route path="scoring" element={<ScoringConfigs />} />
        <Route path="offers" element={<Offers />} />
        <Route path="seller" element={<Navigate to="seller/listings" replace />} />
        <Route path="seller/listings" element={<SellerListings />} />
        <Route path="seller/add" element={<SellerAdd />} />
        <Route path="seller/upload" element={<SellerUpload />} />
        <Route
          path="settings"
          element={
            <RequireEnterprise>
              <Settings />
            </RequireEnterprise>
          }
        />
        <Route path="upgrade" element={<Upgrade />} />
        <Route path="nda" element={<Nda />} />
      </Route>

      <Route
        path="/demo/*"
        element={
          <DemoLayout>
            <Outlet />
          </DemoLayout>
        }
      >
        <Route index element={<Navigate to="tour" replace />} />
        <Route path="listings" element={<Navigate to="/demo/tour" replace />} />
        <Route path="listings/:id" element={<Navigate to="/demo/tour" replace />} />
        <Route path="watchlist" element={<Navigate to="/demo/tour" replace />} />
        <Route path="tour" element={<DemoTour />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
