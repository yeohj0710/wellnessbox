"use client";

export default function Skeleton() {
  return (
    <div className="flex flex-col border rounded-lg overflow-hidden shadow-sm cursor-pointer">
      <div className="h-32 bg-gray-300 animate-pulse"></div>
      <div className="p-2">
        <div className="w-2/3 h-4 bg-gray-300 rounded-md animate-pulse mb-2"></div>
        <div className="w-1/2 h-4 bg-gray-300 rounded-md animate-pulse"></div>
      </div>
    </div>
  );
}
