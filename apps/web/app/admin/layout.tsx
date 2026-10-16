import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminNav } from "@/components/admin/AdminNav";
import { requireUser } from "@/lib/auth/current-user";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/navigation";

/** 運営以外には存在を明かさず404を返す。 */
async function AdminGate({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (user.role !== "admin") notFound();

  return (
    <>
      <AdminNav items={ADMIN_NAV_ITEMS} />
      {children}
    </>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex-1" aria-hidden="true" />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
