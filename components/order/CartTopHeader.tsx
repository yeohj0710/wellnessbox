import { CART_COPY } from "./cart.copy";

type CartTopHeaderProps = {
  onBack: () => void;
};

export default function CartTopHeader({ onBack }: CartTopHeaderProps) {
  return (
    <div className="z-10 fixed top-14 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 h-12 sm:h-14 flex items-center pl-6 pr-4 sm:pl-7 sm:pr-5 mb-6 border-b border-gray-200">
      <button
        onClick={onBack}
        className="text-white text-xl mr-4 font-bold hover:scale-110"
      >
        {CART_COPY.backButtonLabel}
      </button>
      <h1 className="sm:text-lg font-bold text-white">{CART_COPY.pageTitle}</h1>
    </div>
  );
}
