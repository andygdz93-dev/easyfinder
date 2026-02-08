import { Link, NavLink } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "../lib/auth";

const navSections = [
  {
    title: "Buyer",
    items: [
      { to: "/app/listings", label: "Listings" },
      { to: "/app/scoring", label: "Scoring" },
      { to: "/app/offers", label: "Offers" },
    ],
  },
  {
    title: "Seller",
    items: [
      { to: "/app/seller/listings", label: "Listings" },
      { to: "/app/seller/add", label: "Add listing" },
      { to: "/app/seller/upload", label: "Upload" },
    ],
  },
  {
    title: "Enterprise",
    items: [{ to: "/app/settings", label: "Settings" }],
  },
  {
    title: "Upgrade",
    items: [{ to: "/app/upgrade", label: "Upgrade" }],
  },
];

export const AppShell = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { user, clearSession } = useAuth();

  return (
    <div className={`min-h-screen text-slate-100 ${className ?? ""}`}>
      <div className="flex">
        <aside className="min-h-screen w-64 border-r border-slate-800 bg-slate-900/70 px-6 py-8">
          <Link to="/" className="text-xl font-semibold text-white">
            Easy Finder AI
          </Link>
          <p className="mt-2 text-xs text-slate-400">Role: {user?.role ?? "demo"}</p>
          <nav className="mt-8 space-y-6">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {section.title}
                </p>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `block rounded-xl px-3 py-2 text-sm ${
                          isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          {user ? (
            <Button
              variant="outline"
              className="mt-8 w-full"
              onClick={() => clearSession()}
            >
              Log out
            </Button>
          ) : (
            <Link to="/login" className="mt-8 block">
              <Button className="w-full">Sign in</Button>
            </Link>
          )}
        </aside>
        <main className="flex-1">
          <header className="flex items-center justify-between border-b border-slate-800 px-8 py-6">
            <div>
              <h2 className="text-lg font-semibold">Welcome back</h2>
              <p className="text-sm text-slate-400">Premium equipment intelligence</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-300"
                onClick={() =>
                  document.documentElement.classList.toggle("dark")
                }
              >
                Toggle mode
              </button>
              <div className="rounded-full bg-slate-800 px-3 py-2 text-xs text-slate-200">
                {user?.email ?? "demo"}
              </div>
            </div>
          </header>
          <div className="px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
