export const STANDARD_PAGE_SHELL_CLASS =
  "mx-auto w-full max-w-[960px] px-4 sm:px-6 lg:px-8";

export function pageShellClass(...extras: Array<string | false | null | undefined>) {
  return [STANDARD_PAGE_SHELL_CLASS, ...extras].filter(Boolean).join(" ");
}
