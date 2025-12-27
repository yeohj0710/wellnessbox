"use client";

export default function LogoutButton() {
  const onLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <button
      type="button"
      onClick={onLogout}
      className="inline-flex items-center justify-center rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
    >
      로그아웃
    </button>
  );
}
