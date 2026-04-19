"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/students", label: "Alumnos" },
  { href: "/admin/plans", label: "Planes" },
  { href: "/admin/classes", label: "Clases" },
  { href: "/admin/attendance", label: "Asistencia" },
  { href: "/admin/payments", label: "Pagos" },
  { href: "/admin/documents", label: "Documentos" },
  { href: "/admin/config", label: "Configuración" },
];

export default function AdminNav({ email }: { email?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <nav className="bg-gray-900 text-white fixed top-0 left-0 right-0 z-40 h-16 flex items-center px-4 md:px-6">
        <div className="flex items-center gap-3 flex-1">
          <button
            className="md:hidden p-1 rounded hover:bg-gray-700"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/admin/dashboard" className="flex items-center">
            {/* Mobile: isotipo / Desktop: logo horizontal */}
            <img src="/logo-isotipo-oscuro.svg" alt="BJJ Admin" width={36} height={36} className="md:hidden" />
            <img src="/logo-horizontal-oscuro.svg" alt="BJJ Administrator" width={160} height={32} className="hidden md:block" />
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {email && <span className="text-gray-400 text-xs hidden md:block">{email}</span>}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Salir
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black bg-opacity-50" onClick={() => setMobileOpen(false)}>
          <div className="bg-gray-900 w-64 h-full pt-16" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith(item.href)
                      ? "bg-gray-700 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
