"use client";

interface Category {
  id: number;
  name: string;
  image?: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: number | null;
  setSelectedCategory: (id: number | null) => void;
  setSelectedPackage: (pkg: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  setSelectedCategory,
  setSelectedPackage,
  isLoading,
  setIsLoading,
}: CategoryFilterProps) {
  return (
    <section
      className="flex gap-4 px-4 mt-1 pb-3 overflow-x-auto"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <style jsx>{`
        ::-webkit-scrollbar {
          height: 8px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
      {isLoading ? (
        Array(12)
          .fill(0)
          .map((_, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gray-300 animate-pulse"></div>
              <div className="w-10 h-4 bg-gray-300 mt-2 rounded-md animate-pulse"></div>
            </div>
          ))
      ) : (
        <div className="flex flex-nowrap items-start gap-5 w-full max-w-[640px]">
          <div
            className={`flex flex-col items-center w-12 shrink-0 cursor-pointer hover:text-gray-700 ${
              selectedCategory === null ? "font-bold" : ""
            }`}
            onClick={() => {
              setIsLoading(true);
              setSelectedCategory(null);
              setSelectedPackage("전체");
              setIsLoading(false);
            }}
          >
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-sm font-bold">전체</span>
            </div>
            <span className="text-xs mt-1 text-center break-words">전체</span>
          </div>
          {categories.map((category) => (
            <div
              key={category.id}
              className={`flex flex-col items-center w-12 shrink-0 cursor-pointer hover:text-gray-700 ${
                selectedCategory === category.id ? "font-bold" : ""
              }`}
              onClick={() => {
                setIsLoading(true);
                setSelectedCategory(category.id);
                setIsLoading(false);
              }}
            >
              {category.image ? (
                <img
                  src={category.image.replace("/public", "/avatar")}
                  alt={category.name || "Category"}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-300"></div>
              )}
              <span className="text-xs mt-1 text-center break-words">
                {category.name || "카테고리"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
