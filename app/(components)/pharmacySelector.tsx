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
    <div className="flex gap-2 px-2 mx-1 sm:mx-0 mb-3 -mt-1 overflow-x-auto scrollbar-hide">
      {pharmacies.map((pharmacy: any) => (
        <div
          key={pharmacy.id}
          className={`flex flex-col items-center justify-center min-w-[120px] max-w-[120px] flex-grow p-2 mb-2 border rounded-lg shadow-sm cursor-pointer 
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
