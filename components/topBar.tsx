import Link from "next/link";

export default function TopBar() {
  return (
    <header className="flex items-center justify-between fixed top-0 w-full bg-white z-50 h-14 shadow-md px-6">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-bold flex flex-row gap-2">
          💊 웰니스박스
        </Link>
      </div>
    </header>
  );
}
