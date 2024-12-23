import Link from "next/link";

export function MenuLinks() {
  const menuItemClasses = (additionalClasses = "") =>
    `relative font-semibold transition-transform duration-200 ease-in-out hover:scale-105 hover:text-blue-600 ${additionalClasses}`;

  return (
    <>
      <Link href="/features" className={menuItemClasses()}>
        구현 완료 기능
      </Link>
    </>
  );
}
