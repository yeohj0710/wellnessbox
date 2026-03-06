import ProductManager from "@/components/manager/productManager";
import { AdminToolPageShell } from "@/components/manager/managerWorkspace";

export default function AdminProductsPage() {
  return (
    <AdminToolPageShell
      eyebrow="Product Catalog"
      title="상품 마스터 관리"
      description="공통 상품명, 설명, 이미지, 카테고리 연결을 한 워크스페이스에서 정리합니다."
    >
      <ProductManager />
    </AdminToolPageShell>
  );
}
