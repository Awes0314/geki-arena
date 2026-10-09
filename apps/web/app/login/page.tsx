import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "ログイン" };

async function RedirectIfLoggedIn() {
  if (await getCurrentUser()) redirect("/");
  return null;
}

export default function LoginPage() {
  return (
    <PageContainer width="sm">
      <PageHeader title="ログイン" />
      <Suspense>
        <RedirectIfLoggedIn />
      </Suspense>
      <Card>
        <LoginForm />
      </Card>
      <p className="mt-4 text-center text-sm">
        <Link href="/password-reset" className="text-accent underline">
          パスワードを忘れた方
        </Link>
      </p>
      <p className="mt-2 text-center text-sm">
        アカウントをお持ちでない方は{" "}
        <Link href="/register" className="text-accent underline">
          新規登録
        </Link>
      </p>
    </PageContainer>
  );
}
