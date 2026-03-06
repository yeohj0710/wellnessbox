import PharmacyProductManager from "@/components/manager/pharmacyProductManager";
import { AdminToolPageShell } from "@/components/manager/managerWorkspace";

export default function AdminPharmacyProductsPage() {
  return (
    <AdminToolPageShell
      eyebrow="Pharmacy Inventory"
      title="약국 상품 운영"
      description="약국별 판매 옵션, 가격, 재고를 검색과 정렬 중심으로 빠르게 관리합니다."
    >
      <PharmacyProductManager />
    </AdminToolPageShell>
  );
}
