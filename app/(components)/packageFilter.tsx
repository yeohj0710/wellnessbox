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
    <section
      data-horizontal-scroll-area="true"
      className="max-w-full overflow-x-auto bg-gray-100 px-4 py-2 scrollbar-hide touch-pan-x"
      style={{
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-x",
      }}
    >
      <div className="flex w-max min-w-full flex-nowrap items-center gap-2 pr-4">
        {packages.map((pkg) => (
          <button
            key={pkg}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-transform duration-300 ${
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
