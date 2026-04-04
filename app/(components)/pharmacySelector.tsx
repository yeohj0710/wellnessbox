"use client";

interface PharmacySelectorProps {
  pharmacies: any[];
  selectedPharmacy: any;
  setSelectedPharmacy: (pharmacy: any) => void;
}

export default function PharmacySelector({
  pharmacies,
  selectedPharmacy,
  setSelectedPharmacy,
}: PharmacySelectorProps) {
  return (
    <div className="mx-1 mb-1 -mt-1 flex max-w-full gap-2 overflow-x-auto px-2 scrollbar-hide sm:mx-0">
      {pharmacies.map((pharmacy: any) => (
        <div
          key={pharmacy.id}
          className={`mb-2 flex min-w-[120px] max-w-[120px] shrink-0 flex-col items-center justify-center rounded-lg border p-2 shadow-sm cursor-pointer 
            hover:bg-gray-100 transition 
            ${selectedPharmacy?.id === pharmacy.id ? "bg-gray-100" : ""}`}
          onClick={() => setSelectedPharmacy(pharmacy)}
        >
          <h4 className="text-sm font-medium text-gray-700 text-center whitespace-nowrap overflow-hidden text-ellipsis">
            {pharmacy.name}
          </h4>
          <p className="text-xs text-gray-500 text-center">
            {pharmacy.distance?.toFixed(1)} km
          </p>
        </div>
      ))}
    </div>
  );
}
