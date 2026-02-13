"use client";

interface PackageFilterProps {
  selectedPackage: string;
  setSelectedPackage: (pkg: string) => void;
}

const packages = ["전체", "7일 패키지", "30일 패키지", "일반 상품"];

export default function PackageFilter({
  selectedPackage,
  setSelectedPackage,
}: PackageFilterProps) {
  return (
    <section className="px-4 py-2 bg-gray-100 overflow-x-auto scrollbar-hide">
      <div className="flex flex-nowrap items-center gap-2 w-max">
        {packages.map((pkg) => (
          <button
            key={pkg}
            className={`px-4 py-2 border rounded-full text-sm transition-transform duration-300 ${
              selectedPackage === pkg
                ? "bg-gray-200 font-bold shadow-sm"
                : "bg-white md:hover:bg-gray-100"
            }`}
            onClick={() => setSelectedPackage(pkg)}
          >
            {pkg}
          </button>
        ))}
      </div>
    </section>
  );
}
