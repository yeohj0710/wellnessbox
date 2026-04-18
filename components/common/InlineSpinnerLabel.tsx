"use client";

type InlineSpinnerLabelProps = {
  label: string;
  className?: string;
  spinnerClassName?: string;
  size?: "sm" | "md";
};

function joinClassNames(...values: Array<string | null | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

const spinnerSizeClasses = {
  sm: {
    shell: "h-4 w-4",
    ring: "inset-[2px] border-[1.5px]",
    dot: "h-1 w-1",
  },
  md: {
    shell: "h-5 w-5",
    ring: "inset-[2px] border-2",
    dot: "h-1.5 w-1.5",
  },
} as const;

export default function InlineSpinnerLabel({
  label,
  className,
  spinnerClassName,
  size = "sm",
}: InlineSpinnerLabelProps) {
  const spinnerSize = spinnerSizeClasses[size];

  return (
    <span
      className={joinClassNames(
        "inline-flex items-center gap-2 whitespace-nowrap leading-none",
        className
      )}
    >
      <span
        aria-hidden
        className={joinClassNames(
          "relative inline-flex items-center justify-center",
          spinnerSize.shell,
          spinnerClassName
        )}
      >
        <span className="absolute inset-0 rounded-full bg-current opacity-20 animate-pulse" />
        <span className="absolute inset-0 rounded-full border border-current opacity-20" />
        <span
          className={joinClassNames(
            "absolute animate-spin rounded-full border-current border-r-transparent",
            spinnerSize.ring
          )}
        />
        <span className={joinClassNames("rounded-full bg-current opacity-80", spinnerSize.dot)} />
      </span>
      <span className="font-medium tracking-normal">{label}</span>
    </span>
  );
}
