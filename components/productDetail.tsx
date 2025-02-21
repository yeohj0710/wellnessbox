"use client";

import { useEffect, useState } from "react";
import AddressModal from "./addressModal";
import { formatPriceRange } from "@/lib/utils";
import { getReviewsByProductId } from "@/lib/review";
import StarRating from "./starRating";
import FullPageLoader from "./fullPageLoader";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

export default function ProductDetail({
  product,
  optionType,
  onClose,
  onAddToCart,
  pharmacy,
}: any) {
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(product.price);
  const [isFirstModalOpen, setIsFirstModalOpen] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [totalReviewCount, setTotalReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState<number>(5.0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<any>(optionType);
  useEffect(() => {
    async function fetchReviews() {
      if (!product.id) return;
      setIsLoadingReviews(true);
      const fetchedReviews = await getReviewsByProductId(product.id);
      let totalRating = 0;
      const maskedReviews = fetchedReviews.map((review: any) => {
        totalRating += review.rate;
        return {
          ...review,
          order: {
            phone: review.order?.phone
              ? review.order.phone.replace(
                  /(\d{3})[-.]?(\d{4})[-.]?(\d{4})/,
                  "$1-****-$3"
                )
              : null,
          },
          formattedCreatedAt: new Date(review.createdAt).toLocaleDateString(),
          formattedOrderCreatedAt: review.order?.createdAt
            ? new Date(review.order.createdAt).toLocaleDateString()
            : null,
        };
      });
      setReviews(maskedReviews);
      setTotalReviewCount(maskedReviews.length);
      setAverageRating(
        maskedReviews.length > 0
          ? parseFloat((totalRating / maskedReviews.length).toFixed(1))
          : 0.0
      );
      setIsLoadingReviews(false);
    }
    fetchReviews();
  }, [product.id]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const handlePopState = (event: PopStateEvent) => {
      onClose();
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [onClose]);
  useEffect(() => {
    if (product.pharmacyProducts.length > 0 && !selectedOption) {
      setSelectedOption(product.pharmacyProducts[0].optionType);
    }
  }, [product.pharmacyProducts, selectedOption]);
  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => {
      const newQuantity = Math.max(1, prev + delta);
      setTotalPrice(product.price * newQuantity);
      return newQuantity;
    });
  };
  const handleOptionChange = (option: string) => {
    setSelectedOption(option);
    setQuantity(1);
  };
  return (
    <div className="fixed inset-0 bg-white flex justify-center items-center">
      <div
        className="overflow-y-auto max-h-screen fixed inset-x-0 top-14 bg-white w-full max-w-[640px] mx-auto"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="relative">
          <div className="relative">
            {product.images && product.images.length > 0 ? (
              <div className="relative w-full h-72 sm:h-80 overflow-hidden">
                {product.images.map((image: any, index: any) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${product.name} 이미지 ${index + 1}`}
                    className={`absolute w-full h-72 sm:h-80 object-contain bg-white transition-transform ${
                      index === 0 ? "block" : "hidden"
                    }`}
                    data-image-index={index}
                  />
                ))}
                <button
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 p-1"
                  onClick={() => {
                    const images = document.querySelectorAll(
                      `[data-image-index]`
                    ) as NodeListOf<HTMLImageElement>;
                    const currentIndex = Array.from(images).findIndex(
                      (img) => img.style.display !== "none"
                    );
                    images[currentIndex].style.display = "none";
                    images[
                      (currentIndex - 1 + images.length) % images.length
                    ].style.display = "block";
                  }}
                >
                  <ChevronLeftIcon className="w-6 h-6 text-gray-600 hover:text-gray-800" />
                </button>
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
                  onClick={() => {
                    const images = document.querySelectorAll(
                      `[data-image-index]`
                    ) as NodeListOf<HTMLImageElement>;
                    const currentIndex = Array.from(images).findIndex(
                      (img) => img.style.display !== "none"
                    );
                    images[currentIndex].style.display = "none";
                    images[(currentIndex + 1) % images.length].style.display =
                      "block";
                  }}
                >
                  <ChevronRightIcon className="w-6 h-6 text-gray-600 hover:text-gray-800" />
                </button>
              </div>
            ) : (
              <div className="w-full h-60 bg-gray-300 flex items-center justify-center text-gray-500">
                이미지 없음
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-gray-600 hover:text-gray-800"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 pb-32">
          <h1 className="text-xl font-bold">{product.name}</h1>
          <div className="mt-4">
            <label className="block text-gray-600 text-sm font-medium mb-2">
              옵션 선택
            </label>
            <select
              value={selectedOption || ""}
              onChange={(e) => handleOptionChange(e.target.value)}
              className="border rounded-md w-full px-3 py-2 text-gray-700 focus:ring-2 focus:ring-sky-400 focus:outline-none"
            >
              {Array.from(
                new Set(
                  (pharmacy
                    ? product.pharmacyProducts.filter(
                        (pp: any) => pp.pharmacy?.id === pharmacy.id
                      )
                    : product.pharmacyProducts
                  ).map((pp: any) => pp.optionType)
                ) as Set<string>
              ).map((optionType, index) => {
                const relevantProducts = pharmacy
                  ? product.pharmacyProducts.filter(
                      (pp: any) => pp.pharmacy?.id === pharmacy.id
                    )
                  : product.pharmacyProducts;
                const capacity = relevantProducts.find(
                  (pp: any) => pp.optionType === optionType
                )?.capacity;
                return (
                  <option key={index} value={optionType}>
                    {optionType}
                    {capacity ? ` (${capacity})` : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <p className="text-lg font-bold mt-4 mb-2 text-sky-500">
            {formatPriceRange({
              product,
              quantity: 1,
              optionType: selectedOption || undefined,
              pharmacy,
            })}
          </p>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">
              * 주소 입력 후 약국이 선택되면 정확한 상품 가격을 알려드려요.
            </span>
            <span className="text-xs text-gray-500">
              * 상품 주문 후 배송 완료까지 최대 4-5 영업일이 소요돼요.
            </span>
          </div>
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => handleQuantityChange(-1)}
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <MinusIcon className="w-4 h-4 text-gray-700" />
            </button>
            <span className="mx-4 text-xl font-bold text-gray-800">
              {quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(1)}
              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <PlusIcon className="w-4 h-4 text-gray-700" />
            </button>
          </div>
          {isLoadingReviews ? (
            <div className="-mt-12 mb-36">
              <FullPageLoader />
            </div>
          ) : (
            <div className="mt-16 mb-36">
              <h2 className="text-lg font-bold mb-2">
                상품 리뷰 ({totalReviewCount}개)
              </h2>
              <span className="block text-xs text-gray-400 whitespace-pre-wrap !leading-[1.5]">
                * 상품 리뷰는 배송 완료 처리된 상품에 한해 <b>내 주문 조회</b>
                에서 작성할 수 있어요.
              </span>
              <div className="flex items-center mb-4 mt-2">
                <StarRating rating={averageRating} size={24} />
                <span className="text-gray-700 text-lg ml-2">
                  {averageRating.toFixed(1)} / 5.0 ({totalReviewCount}개)
                </span>
              </div>
              {reviews.length > 0 ? (
                reviews.map((review, index) => (
                  <div key={index} className="border-b mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-500 text-sm">
                        {review.order.phone}
                      </span>
                      <div className="flex items-center">
                        <StarRating rating={review.rate} size={20} />
                        <span className="text-gray-600 text-sm ml-2">
                          {review.rate.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="gap-1 flex flex-col mb-4 mt-2">
                      <span className="text-xs text-gray-400">
                        {product.name},{" "}
                        {review.orderItem.pharmacyProduct.optionType} ×{" "}
                        {review.orderItem.quantity}개
                      </span>
                      <span className="text-xs text-gray-400">
                        판매자: {review.orderItem.pharmacyProduct.pharmacy.name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{review.content}</p>
                    {review.images?.length > 0 && (
                      <div className="flex gap-2 mt-4">
                        {review.images.map(
                          (image: string, imgIndex: number) => (
                            <img
                              key={imgIndex}
                              src={image.replace(/\/public$/, "/avatar")}
                              alt="리뷰 이미지"
                              className="w-16 h-16 object-cover rounded cursor-pointer"
                              onClick={() => setSelectedImage(image)}
                            />
                          )
                        )}
                      </div>
                    )}
                    <div className="mt-4 mb-2">
                      <span className="text-gray-400 text-xs">
                        작성일 {review.formattedCreatedAt}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center mt-24 -mb-6">
                  아직 리뷰가 없어요. 상품을 구매하고 첫 번째 리뷰어가
                  되어주세요!
                </p>
              )}
            </div>
          )}
          <div className="px-5 fixed bottom-0 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 text-white p-4 flex justify-between items-center text-lg font-bold">
            <span>
              {formatPriceRange({
                product,
                quantity,
                optionType: selectedOption || undefined,
                pharmacy,
              })}
            </span>
            <button
              onClick={async () => {
                if (!selectedOption) return;
                const storedCart = localStorage.getItem("cartItems");
                const cart = storedCart ? JSON.parse(storedCart) : [];
                if (cart.length === 0 && !localStorage.getItem("roadAddress")) {
                  setIsFirstModalOpen(true);
                  return;
                }
                const cartItem = {
                  productId: product.id,
                  productName: product.name,
                  optionType: selectedOption,
                  quantity,
                };
                const existingItemIndex = cart.findIndex(
                  (item: any) =>
                    item.productId === cartItem.productId &&
                    item.optionType === cartItem.optionType
                );
                if (existingItemIndex !== -1) {
                  cart[existingItemIndex].quantity += quantity;
                } else {
                  cart.push(cartItem);
                }
                localStorage.setItem("cartItems", JSON.stringify(cart));
                onAddToCart(cartItem);
                onClose();
              }}
              className="bg-white text-sky-400 px-10 py-2 rounded-full shadow-md hover:bg-sky-100 transition"
            >
              담기
            </button>
            {selectedImage && (
              <div
                className="px-2 sm:px-0 fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50"
                onClick={() => setSelectedImage(null)}
              >
                <div className="relative">
                  <button
                    className="absolute top-2 right-4 text-gray-500 rounded-full"
                    onClick={() => setSelectedImage(null)}
                  >
                    ✕
                  </button>
                  <img
                    src={selectedImage}
                    alt="리뷰 확대 이미지"
                    className="max-w-full max-h-full rounded-lg"
                  />
                </div>
              </div>
            )}
            {isFirstModalOpen && (
              <FirstModal
                product={product}
                selectedOption={selectedOption}
                quantity={quantity}
                onAddToCart={onAddToCart}
                onClose={() => setIsFirstModalOpen(false)}
                onProductDetailClose={onClose}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FirstModal({
  product,
  selectedOption,
  quantity,
  onAddToCart,
  onClose,
  onProductDetailClose,
}: any) {
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };
  return (
    <>
      {!isAddressModalOpen ? (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={handleBackgroundClick}
        >
          <div className="bg-white rounded-xl shadow-2xl px-6 sm:px-8 py-8 w-128">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              주소를 입력해 주세요!
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              해당 상품을 주문할 수 있는 약국을 보여드릴게요.
            </p>
            <p className="text-xs font-normal text-gray-600 mt-0.5 mb-6 leading-relaxed">
              (주소는 주문 완료 전에는 어디에도 제공되지 않아요.)
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={onClose}
                className="text-sm font-medium px-3 sm:px-4 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition duration-200"
              >
                다른 상품을 구경할게요.
              </button>
              <button
                onClick={() => setIsAddressModalOpen(true)}
                className="text-sm font-medium px-3 sm:px-4 py-2 bg-sky-500 text-white rounded-md shadow-md hover:bg-sky-600 transition duration-200"
              >
                주소를 입력할게요.
              </button>
            </div>
          </div>
        </div>
      ) : (
        <AddressModal
          onClose={() => {
            setIsAddressModalOpen(false);
            onClose();
          }}
          onSave={async (roadAddress: string, detailAddress: string) => {
            localStorage.setItem("roadAddress", roadAddress);
            localStorage.setItem("detailAddress", detailAddress);
            const storedCart = localStorage.getItem("cartItems");
            const cart = storedCart ? JSON.parse(storedCart) : [];
            const cartItem = {
              productId: product.id,
              productName: product.name,
              optionType: selectedOption,
              quantity,
            };
            cart.push(cartItem);
            localStorage.setItem("cartItems", JSON.stringify(cart));
            onAddToCart(cartItem);
            setIsSaving(true);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            setIsSaving(false);
            setIsAddressModalOpen(false);
            onClose();
            onProductDetailClose();
            window.location.reload();
          }}
        />
      )}
      {isSaving && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </>
  );
}
