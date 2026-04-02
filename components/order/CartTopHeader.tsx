import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { CART_COPY } from "./cart.copy";

type CartTopHeaderProps = {
  onBack: () => void;
};

export default function CartTopHeader({ onBack }: CartTopHeaderProps) {
  return (
    <div className="z-10 fixed top-14 left-0 right-0 mx-auto flex h-12 w-full max-w-[640px] items-center gap-3 border-b border-gray-200 bg-sky-400 px-4 sm:h-14 sm:px-5">
      <button
        onClick={onBack}
        aria-label={CART_COPY.backButtonLabel}
        className="grid h-9 w-9 place-items-center rounded-full text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <ArrowLeftIcon className="h-5 w-5 stroke-[2.4]" />
      </button>
      <h1 className="text-base font-bold text-white sm:text-lg">
        {CART_COPY.pageTitle}
      </h1>
    </div>
  );
}
