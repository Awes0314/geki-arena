import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <PageContainer width="sm">
      <Card>
        <h1 className="mb-2 text-xl font-bold">ページが見つかりません</h1>
        <p className="text-sm text-muted">URLをご確認ください。</p>
      </Card>
    </PageContainer>
  );
}
