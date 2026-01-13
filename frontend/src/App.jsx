import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <div className="min-h-screen bg-brand-blue text-white">
      <Header />
      <Dashboard />
    </div>
  );
}
