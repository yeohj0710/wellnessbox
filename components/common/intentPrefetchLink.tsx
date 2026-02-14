"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrefetchOnIntent } from "@/components/common/usePrefetchOnIntent";

type NextLinkProps = ComponentProps<typeof Link>;

type IntentPrefetchLinkProps = Omit<NextLinkProps, "href"> & {
  href: string;
  intentPrefetch?: boolean;
  prefetchDelayMs?: number;
};

function mergeHandlers<T>(
  first?: (event: T) => void,
  second?: (event: T) => void
) {
  return (event: T) => {
    first?.(event);
    second?.(event);
  };
}

export default function IntentPrefetchLink({
  href,
  intentPrefetch = true,
  prefetchDelayMs = 80,
  onPointerEnter,
  onMouseEnter,
  onFocus,
  onMouseLeave,
  onBlur,
  ...rest
}: IntentPrefetchLinkProps) {
  const router = useRouter();
  const intentHandlers = usePrefetchOnIntent({
    href,
    router,
    enabled: intentPrefetch,
    delayMs: prefetchDelayMs,
  });

  return (
    <Link
      href={href}
      onPointerEnter={mergeHandlers(onPointerEnter, intentHandlers.onPointerEnter)}
      onMouseEnter={mergeHandlers(onMouseEnter, intentHandlers.onMouseEnter)}
      onFocus={mergeHandlers(onFocus, intentHandlers.onFocus)}
      onMouseLeave={mergeHandlers(onMouseLeave, intentHandlers.onMouseLeave)}
      onBlur={mergeHandlers(onBlur, intentHandlers.onBlur)}
      {...rest}
    />
  );
}

