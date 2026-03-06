import CategoryManager from "@/components/manager/categoryManager";
import { AdminToolPageShell } from "@/components/manager/managerWorkspace";

export default function AdminCategoriesPage() {
  return (
    <AdminToolPageShell
      eyebrow="Category System"
      title="카테고리 체계 관리"
      description="카테고리 분류 체계와 대표 이미지를 더 빠르고 안정적으로 운영할 수 있도록 별도 워크스페이스로 분리했습니다."
    >
      <CategoryManager />
    </AdminToolPageShell>
  );
}
