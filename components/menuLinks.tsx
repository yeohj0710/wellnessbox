import Link from "next/link";

export function MenuLinks() {
  const menuItemClasses = (additionalClasses = "") =>
    `relative font-semibold transition-transform duration-200 ease-in-out hover:scale-105 hover:text-blue-600 ${additionalClasses}`;

  return (
    <>
      <Link href="/features" className={menuItemClasses()}>
        기능 테스트
      </Link>
      <Link href="/admin" className={menuItemClasses()}>
        상품 관리
      </Link>
    </>
  );
}
