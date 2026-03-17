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
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
} as const;

export default function InlineSpinnerLabel({
  label,
  className,
  spinnerClassName,
  size = "sm",
}: InlineSpinnerLabelProps) {
  return (
    <span className={joinClassNames("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={joinClassNames(
          "animate-spin rounded-full border-current border-t-transparent",
          spinnerSizeClasses[size],
          spinnerClassName
        )}
      />
      <span>{label}</span>
    </span>
  );
}
