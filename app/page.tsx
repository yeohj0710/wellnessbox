"use client";

export default function Home() {
  return (
    <div className="w-full max-w-[640px] mx-auto">
      <section className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-gray-300"></div>
          <span className="text-sm mt-1">카테고리1</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-gray-300"></div>
          <span className="text-sm mt-1">카테고리2</span>
        </div>
      </section>
      <section className="flex gap-2 px-4 py-3 bg-gray-100">
        <button className="px-4 py-2 bg-white border rounded-full text-sm">
          기본순
        </button>
        <button className="px-4 py-2 bg-white border rounded-full text-sm">
          쿠폰
        </button>
        <button className="px-4 py-2 bg-white border rounded-full text-sm">
          배달방식
        </button>
      </section>
      <section className="grid grid-cols-2 gap-4 px-4 py-4">
        <div className="flex flex-col border rounded-lg overflow-hidden shadow-sm">
          <div className="h-32 bg-gray-300"></div>
          <div className="p-2">
            <h3 className="text-sm font-bold">제품명</h3>
            <p className="text-xs text-gray-600">설명</p>
            <p className="text-sm font-bold mt-2">₩10,000</p>
          </div>
        </div>
        <div className="flex flex-col border rounded-lg overflow-hidden shadow-sm">
          <div className="h-32 bg-gray-300"></div>
          <div className="p-2">
            <h3 className="text-sm font-bold">제품명</h3>
            <p className="text-xs text-gray-600">설명</p>
            <p className="text-sm font-bold mt-2">₩10,000</p>
          </div>
        </div>
      </section>
    </div>
  );
}
