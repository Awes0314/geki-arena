import type { ReactNode } from "react";

/** ページ共通のコンテンツ幅・余白。モバイル下部ナビ分の余白を含む。 */
export function PageContainer({ children, width = "md" }: { children: ReactNode; width?: "sm" | "md" }) {
  const maxWidth = width === "sm" ? "max-w-md" : "max-w-4xl";
  return <main className={`mx-auto w-full flex-1 px-4 py-6 pb-24 md:pb-8 ${maxWidth}`}>{children}</main>;
}

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {actions}
    </div>
  );
}
