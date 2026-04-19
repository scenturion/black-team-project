"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/student/dashboard", label: "Inicio" },
  { href: "/student/classes", label: "Clases" },
  { href: "/student/bookings", label: "Mis Reservas" },
  { href: "/student/payments", label: "Pagos" },
  { href: "/student/documents", label: "Documentos" },
  { href: "/student/profile", label: "Mi Perfil" },
];

export default function StudentNav({ name }: { name?: string }) {
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
      <nav className="bg-blue-800 text-white fixed top-0 left-0 right-0 z-40 h-16 flex items-center px-4 md:px-6">
        <div className="flex items-center gap-3 flex-1">
          <button
            className="md:hidden p-1 rounded hover:bg-blue-700"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/student/dashboard" className="flex items-center">
            <img src="/logo-isotipo-oscuro.svg" alt="BJJ Academy" width={36} height={36} className="md:hidden" />
            <img src="/logo-horizontal-oscuro.svg" alt="BJJ Academy" width={160} height={32} className="hidden md:block" />
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-blue-700 text-white"
                  : "text-blue-200 hover:bg-blue-700 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {name && (
            <div className="hidden md:flex items-center gap-2">
              <img src="/avatar-default.svg" alt={name} width={32} height={32} className="rounded-full" />
              <span className="text-blue-200 text-xs">{name}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-blue-200 hover:text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Salir
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black bg-opacity-50" onClick={() => setMobileOpen(false)}>
          <div className="bg-blue-900 w-64 h-full pt-16" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 flex flex-col gap-1">
              {name && (
                <div className="flex items-center gap-3 px-4 py-3 mb-2 border-b border-blue-700">
                  <img src="/avatar-default.svg" alt={name} width={32} height={32} className="rounded-full" />
                  <span className="text-blue-200 text-sm">{name}</span>
                </div>
              )}
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith(item.href)
                      ? "bg-blue-700 text-white"
                      : "text-blue-200 hover:bg-blue-700 hover:text-white"
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
