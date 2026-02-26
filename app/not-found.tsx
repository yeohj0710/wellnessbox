import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mt-[15vh] flex min-h-screen flex-col items-center px-6 text-center">
      <Image
        src="/logo.png"
        alt="웰니스박스 로고"
        width={96}
        height={96}
        className="object-contain"
      />
      <h1 className="mt-8 text-xl font-bold text-gray-800 sm:text-3xl">
        페이지를 찾을 수 없어요
      </h1>
      <p className="mt-4 text-sm text-gray-600 sm:mt-6 sm:text-base">
        주소가 변경되었거나 삭제된 페이지일 수 있어요.
      </p>
      <Link
        href="/column"
        className="mt-6 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
      >
        칼럼 목록으로 이동
      </Link>
    </div>
  );
}
