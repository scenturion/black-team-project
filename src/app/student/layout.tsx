import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import StudentNav from "@/components/layout/StudentNav";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "ADMIN") redirect("/admin/dashboard");

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    select: { firstName: true, lastName: true, status: true },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentNav name={student ? `${student.firstName} ${student.lastName}` : undefined} />
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
