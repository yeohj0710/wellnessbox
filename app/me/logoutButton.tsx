"use client";

export default function LogoutButton() {
  const onLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <button
      onClick={onLogout}
      className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800"
    >
      로그아웃
    </button>
  );
}
