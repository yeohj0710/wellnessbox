"use client";

export default function FooterCartBarLoading() {
  return (
    <div className="px-5 fixed bottom-0 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 text-white p-4 flex justify-center items-center text-lg font-bold">
      <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
