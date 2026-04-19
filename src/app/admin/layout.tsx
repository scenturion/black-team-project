import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminNav from "@/components/layout/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/student/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav email={session.email} />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
