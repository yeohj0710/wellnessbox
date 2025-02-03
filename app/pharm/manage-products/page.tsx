import { getPharmacy } from "@/lib/pharmacy";
import { redirect } from "next/navigation";
import PharmacyProductManager from "@/components/pharmacyProductManager";

export default async function ManageProductsPage() {
  const pharm = await getPharmacy();
  if (!pharm) {
    redirect("/pharm-login");
  }
  return (
    <div className="w-full flex flex-col items-center mt-8 mb-12 gap-6">
      <h1 className="text-2xl font-bold">상품 등록/관리</h1>
      <PharmacyProductManager pharmacyId={pharm.id} />
    </div>
  );
}
