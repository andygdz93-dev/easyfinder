import { NavLink } from "react-router-dom";

const links = [
  ["/app/admin", "Overview"],
  ["/app/admin/users", "Users"],
  ["/app/admin/listings", "Listings"],
  ["/app/admin/inquiries", "Inquiries"],
  ["/app/admin/audit", "Audit"],
  ["/app/admin/sources", "Sources"],
  ["/app/admin/settings", "Settings"],
] as const;

export default function AdminSidebar() {
  return (
    <aside className="w-64 min-h-screen border-r border-slate-800 bg-slate-900/80 p-4">
      <h2 className="text-lg font-semibold text-white">Admin Console</h2>
      <nav className="mt-4 space-y-1">
        {links.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/app/admin"}
            className={({ isActive }) =>
              `block rounded px-3 py-2 text-sm ${isActive ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800"}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
