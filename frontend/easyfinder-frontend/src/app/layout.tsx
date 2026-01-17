"use client";

import { useEffect } from "react";
import "./globals.css";

import Sidebar from "@/app/components/layout/Sidebar";
import Topbar from "@/app/components/layout/Topbar";
import { loadMe } from "@/lib/auth";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    loadMe();
  }, []);

  return (
    <html lang="en">
      <body className="h-screen overflow-hidden bg-slate-50">
        <div className="grid grid-cols-[240px_1fr] grid-rows-[64px_1fr] h-full">
          
          {/* Sidebar */}
          <aside className="row-span-2 border-r bg-white">
            <Sidebar />
          </aside>

          {/* Topbar */}
          <header className="border-b bg-white">
            <Topbar />
          </header>

          {/* Main Content */}
          <main className="overflow-auto p-6">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}
