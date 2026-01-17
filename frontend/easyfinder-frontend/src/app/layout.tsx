import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import AuthProvider from "@/components/auth/AuthProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-slate-50">
        <AuthProvider>
          <Sidebar />
          <div className="flex flex-col flex-1">
            <Topbar />
            <main className="p-6">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
