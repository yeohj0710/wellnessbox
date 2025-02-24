"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { TrashIcon } from "@heroicons/react/16/solid";
import { ExpandableSection } from "./expandableSection";
import { useRouter } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { getLoginStatus } from "@/lib/useLoginStatus";
import Image from "next/image";

export default function Cart({
  cartItems,
  totalPrice,
  selectedPharmacy,
  allProducts,
  onBack,
  onUpdateCart,
}: any) {
  const router = useRouter();
  const [loginStatus, setLoginStatus] = useState<any>([]);
  const [showPharmacyDetail, setShowPharmacyDetail] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [roadAddress, setRoadAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [entrancePassword, setEntrancePassword] = useState("");
  const [directions, setDirections] = useState("");
  const [phonePart1, setPhonePart1] = useState("010");
  const [phonePart2, setPhonePart2] = useState("");
  const [phonePart3, setPhonePart3] = useState("");
  const [userContact, setUserContact] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("inicis");
  useEffect(() => {
    const fetchLoginStatus = async () => {
      const fetchgedLoginStatus = await getLoginStatus();
      setLoginStatus(fetchgedLoginStatus);
    };
    fetchLoginStatus();
  }, []);
  useEffect(() => {
    const storedRoadAddress = localStorage.getItem("roadAddress");
    const storedDetailAddress = localStorage.getItem("detailAddress");
    const storedDetailAddressInput = localStorage.getItem(
      "detailAddress_input"
    );
    const storedRequestNotes = localStorage.getItem("requestNotes_input");
    const storedEntrancePassword = localStorage.getItem(
      "entrancePassword_input"
    );
    const storedDirections = localStorage.getItem("directions_input");
    const storedPhonePart1 = localStorage.getItem("phonePart1_input");
    const storedPhonePart2 = localStorage.getItem("phonePart2_input");
    const storedPhonePart3 = localStorage.getItem("phonePart3_input");
    const password = localStorage.getItem("password_input");
    if (storedRoadAddress) setRoadAddress(storedRoadAddress);
    if (storedDetailAddressInput) {
      setDetailAddress(storedDetailAddressInput);
    } else if (storedDetailAddress) {
      setDetailAddress(storedDetailAddress);
    }
    if (storedRequestNotes) setRequestNotes(storedRequestNotes);
    if (storedEntrancePassword) setEntrancePassword(storedEntrancePassword);
    if (storedDirections) setDirections(storedDirections);
    if (storedPhonePart1) setPhonePart1(storedPhonePart1);
    if (storedPhonePart2) setPhonePart2(storedPhonePart2);
    if (storedPhonePart3) setPhonePart3(storedPhonePart3);
    if (password) setPassword(password);
    if ((window as any).IMP) {
      setSdkLoaded(true);
    }
    setUserContact(
      `${storedPhonePart1 || phonePart1}-${storedPhonePart2 || phonePart2}-${
        storedPhonePart3 || phonePart3
      }`
    );
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    localStorage.setItem("roadAddress_input", roadAddress);
  }, [roadAddress]);
  useEffect(() => {
    localStorage.setItem("detailAddress_input", detailAddress);
  }, [detailAddress]);
  useEffect(() => {
    localStorage.setItem("requestNotes_input", requestNotes);
  }, [requestNotes]);
  useEffect(() => {
    localStorage.setItem("entrancePassword_input", entrancePassword);
  }, [entrancePassword]);
  useEffect(() => {
    localStorage.setItem("directions_input", directions);
  }, [directions]);
  useEffect(() => {
    localStorage.setItem("phonePart1_input", phonePart1);
  }, [phonePart1]);
  useEffect(() => {
    localStorage.setItem("phonePart2_input", phonePart2);
  }, [phonePart2]);
  useEffect(() => {
    localStorage.setItem("phonePart3_input", phonePart3);
  }, [phonePart3]);
  useEffect(() => {
    setUserContact(`${phonePart1}-${phonePart2}-${phonePart3}`);
  }, [phonePart1, phonePart2, phonePart3]);
  useEffect(() => {
    const phonePart1Input = document.querySelector("input[value='010']");
    const phonePart2Input = document.getElementById(
      "phonePart2"
    ) as HTMLInputElement;
    const phonePart3Input = document.getElementById(
      "phonePart3"
    ) as HTMLInputElement;
    if (phonePart1Input) {
      phonePart1Input.classList.add("bg-gray-100", "text-gray-500");
    }
    if (phonePart2.length === 4 && phonePart2Input) {
      phonePart2Input.classList.add("bg-gray-100", "text-gray-500");
    }
    if (phonePart3.length === 4 && phonePart3Input) {
      phonePart3Input.classList.add("bg-gray-100", "text-gray-500");
    }
  }, [phonePart2, phonePart3]);
  useEffect(() => {
    localStorage.setItem("password_input", password);
  }, [password]);
  useEffect(() => {
    localStorage.setItem("selectedPharmacyId", selectedPharmacy?.id);
  }, [selectedPharmacy]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBack();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);
  const deliveryFee = 3000;
  const totalPriceWithDelivery = totalPrice + deliveryFee;
  const handleKGInicisPayment = () => {
    const IMP = (window as any).IMP;
    if (!IMP) {
      alert("결제 모듈을 불러오는 데 실패하였습니다.");
      return;
    }
    IMP.init(process.env.NEXT_PUBLIC_MERCHANT_ID);
    const paymentAmount =
      loginStatus.isTestLoggedIn && selectedPaymentMethod === "inicis"
        ? 1
        : totalPriceWithDelivery;
    IMP.request_pay(
      {
        pg: "html5_inicis",
        pay_method: "card",
        merchant_uid: `order_${Date.now()}`,
        name: "웰니스박스 건강기능식품",
        amount: paymentAmount,
        buyer_email: "buyer@example.com",
        buyer_name: userContact,
        buyer_tel: userContact,
        buyer_addr: `${roadAddress} ${detailAddress}`,
      },
      function (rsp: any) {
        if (rsp.success) {
          localStorage.setItem("paymentId", rsp.imp_uid);
          router.push("/order-complete");
        } else {
          alert(`결제에 실패하였습니다: ${rsp.error_msg}`);
        }
      }
    );
  };
  const handleKpnAndKakaoPayment = async (
    payMethod: string,
    channelKey: string
  ) => {
    const PortOne: any = await import("@portone/browser-sdk/v2");
    try {
      const paymentId = `payment${Date.now()}`;
      localStorage.setItem("paymentId", paymentId);
      const response = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        paymentId,
        orderName: "웰니스박스 건강기능식품",
        totalAmount: totalPriceWithDelivery,
        currency: "KRW",
        channelKey,
        payMethod,
        customer: {
          customerId: "user",
          fullName: "user",
          email: "user@example.com",
          phoneNumber: userContact,
        },
        redirectUrl: `${window.location.origin}/order-complete`,
      });
      if (!response.code) {
        router.push(`/order-complete`);
      } else {
        alert("결제가 취소되었습니다.");
      }
    } catch (error) {
      console.error("결제 요청 중 오류 발생:", error);
      alert(`결제 요청 중 오류가 발생했습니다: ${JSON.stringify(error)}`);
    }
  };
  const handlePayment = async () => {
    localStorage.setItem("paymentMethod", selectedPaymentMethod);
    if (selectedPaymentMethod === "inicis") {
      handleKGInicisPayment();
    } else if (selectedPaymentMethod === "kpn") {
      await handleKpnAndKakaoPayment(
        "CARD",
        process.env.NEXT_PUBLIC_PORTONE_CARD_CHANNEL_KEY!
      );
    } else if (selectedPaymentMethod === "kakao") {
      await handleKpnAndKakaoPayment(
        "EASY_PAY",
        process.env.NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY!
      );
    }
  };
  return (
    <div className="w-full mt-32 mb-8 max-w-[640px] mx-auto bg-white min-h-[100vh]">
      <Script
        src="https://cdn.iamport.kr/js/iamport.payment-1.2.0.js"
        onLoad={() => {
          setSdkLoaded(true);
        }}
        strategy="afterInteractive"
      />
      <div className="z-10 fixed top-14 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 h-12 sm:h-14 flex items-center px-4 mb-6 border-b border-gray-200">
        <button
          onClick={onBack}
          className="text-white text-xl mr-4 font-bold hover:scale-110"
        >
          ←
        </button>
        <h1 className="sm:text-lg font-bold text-white">장바구니</h1>
      </div>
      <div className="px-4 sm:mt-2">
        <h2 className="text-lg font-bold pb-4 border-b mb-4">선택한 상품</h2>
      </div>
      <div className="space-y-4 px-4 mb-2">
        {cartItems.length > 0 ? (
          cartItems.map((item: any) => {
            const product = allProducts.find(
              (product: any) => product.id === item.productId
            );
            const pharmacyProduct = product?.pharmacyProducts.find(
              (pharmacyProduct: any) =>
                pharmacyProduct.optionType === item.optionType &&
                pharmacyProduct.pharmacy.id === selectedPharmacy?.id
            );
            if (!pharmacyProduct) return;
            return (
              <div
                key={pharmacyProduct.id}
                className="flex items-center gap-4 border-b pb-4"
              >
                {product.images && product.images.length > 0 ? (
                  <div className="relative w-16 h-16">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      sizes="128px"
                      className="rounded-md object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-md bg-gray-300 flex items-center justify-center text-xs text-gray-500">
                    이미지 없음
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="font-bold">
                    {product.name} ({pharmacyProduct?.optionType || ""})
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {product.categories
                      ?.map((category: any) => category.name)
                      .join(", ") || "카테고리 없음"}
                  </p>
                  <p className="mt-1 font-bold text-sky-500">
                    {pharmacyProduct?.price?.toLocaleString()}원
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const updatedItems = cartItems.map((i: any) =>
                        i.productId === item.productId &&
                        i.optionType === item.optionType &&
                        i.quantity > 1
                          ? { ...i, quantity: i.quantity - 1 }
                          : i
                      );
                      onUpdateCart(updatedItems);
                      localStorage.setItem(
                        "cartItems",
                        JSON.stringify(updatedItems)
                      );
                    }}
                    className="leading-none w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-lg"
                  >
                    -
                  </button>
                  <span className="font-bold">{item.quantity}</span>
                  <button
                    onClick={() => {
                      if (
                        pharmacyProduct &&
                        item.quantity < pharmacyProduct.stock
                      ) {
                        const updatedItems = cartItems.map((i: any) =>
                          i.productId === item.productId &&
                          i.optionType === item.optionType
                            ? { ...i, quantity: i.quantity + 1 }
                            : i
                        );
                        onUpdateCart(updatedItems);
                        localStorage.setItem(
                          "cartItems",
                          JSON.stringify(updatedItems)
                        );
                      } else {
                        alert(
                          `${selectedPharmacy.name}에서 담을 수 있는 ${product.name} (${pharmacyProduct.optionType})의 최대 개수예요.`
                        );
                      }
                    }}
                    className="leading-none w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-lg"
                  >
                    +
                  </button>
                  <button
                    onClick={() => {
                      const updatedItems = cartItems.filter(
                        (i: any) =>
                          !(
                            i.productId === item.productId &&
                            i.optionType === item.optionType
                          )
                      );
                      onUpdateCart(updatedItems);
                      localStorage.setItem(
                        "cartItems",
                        JSON.stringify(updatedItems)
                      );
                    }}
                    className="leading-none w-8 h-8 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center"
                  >
                    <TrashIcon className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex justify-center items-center h-28">
            <p className="text-gray-500 font-medium">장바구니가 텅 비었어요.</p>
          </div>
        )}
      </div>
      <h2 className="text-lg font-bold p-4 pb-2">주소 입력</h2>
      <div className="px-4 space-y-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            도로명 주소
          </label>
          <p className="text-base text-gray-500 bg-gray-100 px-2.5 py-2 rounded-md border">
            {roadAddress || "저장된 도로명 주소가 없습니다."}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            상세 주소 (선택)
          </label>
          <input
            type="text"
            value={detailAddress}
            onChange={(e) => {
              setDetailAddress(e.target.value);
              localStorage.setItem("detailAddress_input", e.target.value);
            }}
            placeholder="예: A동 101호"
            className="focus:outline-none focus:ring-2 focus:ring-sky-400 w-full border rounded-md px-3 py-2 text-base transition-colors text-gray-700"
          />
        </div>
      </div>
      <h2 className="text-lg font-bold p-4 pb-2 mt-2">추가 요청사항</h2>
      <div className="px-4 space-y-3">
        <ExpandableSection title="배송 시 요청사항 (선택)">
          <input
            type="text"
            value={requestNotes}
            onChange={(e) => {
              setRequestNotes(e.target.value);
              localStorage.setItem("requestNotes_input", e.target.value);
            }}
            placeholder="예: 문 앞에 놓아주세요."
            className="focus:outline-none focus:ring-2 focus:ring-sky-400 w-full border rounded-md px-3 py-2 text-base"
          />
        </ExpandableSection>
        <ExpandableSection title="공동현관 비밀번호 (선택)">
          <input
            type="text"
            value={entrancePassword}
            onChange={(e) => {
              setEntrancePassword(e.target.value);
              localStorage.setItem("entrancePassword_input", e.target.value);
            }}
            placeholder="예: #1234"
            className="focus:outline-none focus:ring-2 focus:ring-sky-400 w-full border rounded-md px-3 py-2 text-base"
          />
        </ExpandableSection>
        <ExpandableSection title="찾아오는 길 안내 (선택)">
          <input
            type="text"
            value={directions}
            onChange={(e) => {
              setDirections(e.target.value);
              localStorage.setItem("directions_input", e.target.value);
            }}
            placeholder="예: 마트 옆에 건물 입구가 있어요."
            className="focus:outline-none focus:ring-2 focus:ring-sky-400 w-full border rounded-md px-3 py-2 text-base"
          />
        </ExpandableSection>
      </div>
      <h2 className="text-lg font-bold p-4 pb-2 mt-3">연락처 입력</h2>
      <div className="px-4 flex gap-2 items-center">
        <input
          type="text"
          maxLength={3}
          value={phonePart1}
          onChange={(e) => {
            const newValue = e.target.value.replace(/\D/g, "");
            setPhonePart1(newValue);
            localStorage.setItem("phonePart1_input", newValue);
          }}
          onInput={(e) => {
            const input = e.target as HTMLInputElement;
            if (input.value.length === 3) {
              input.classList.add("bg-gray-100", "text-gray-500");
            } else {
              input.classList.remove("bg-gray-100", "text-gray-500");
            }
          }}
          className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-14 border rounded-md px-2 py-1.5 text-center transition-colors ${
            phonePart1.length === 3 ? "bg-gray-100 text-gray-500" : ""
          }`}
        />
        <span className="text-gray-500">-</span>
        <input
          id="phonePart2"
          type="text"
          maxLength={4}
          value={phonePart2}
          onChange={(e) => {
            const newValue = e.target.value.replace(/\D/g, "");
            setPhonePart2(newValue);
            localStorage.setItem("phonePart2_input", newValue);
            if (newValue.length === 4) {
              (
                document.getElementById("phonePart3") as HTMLInputElement
              )?.focus();
            }
          }}
          onInput={(e) => {
            const input = e.target as HTMLInputElement;
            if (input.value.replace(/\D/g, "").length === 4) {
              input.classList.add("bg-gray-100", "text-gray-500");
            } else {
              input.classList.remove("bg-gray-100", "text-gray-500");
            }
          }}
          className="focus:outline-none focus:ring-2 focus:ring-sky-400 w-20 border rounded-md px-2 py-1.5 text-center transition-colors"
        />
        <span className="text-gray-500">-</span>
        <input
          id="phonePart3"
          type="text"
          maxLength={4}
          value={phonePart3}
          onChange={(e) => {
            const newValue = e.target.value.replace(/\D/g, "");
            setPhonePart3(newValue);
            localStorage.setItem("phonePart3_input", newValue);
          }}
          onInput={(e) => {
            const input = e.target as HTMLInputElement;
            if (input.value.replace(/\D/g, "").length === 4) {
              input.classList.add("bg-gray-100", "text-gray-500");
            } else {
              input.classList.remove("bg-gray-100", "text-gray-500");
            }
          }}
          className="focus:outline-none focus:ring-2 focus:ring-sky-400 w-20 border rounded-md px-2 py-1.5 text-center transition-colors"
        />
      </div>
      <h2 className="text-lg font-bold p-4 pb-2 mt-2">주문 조회 비밀번호</h2>
      <div className="px-4 space-y-3">
        <input
          type="text"
          value={password}
          onChange={(e) => {
            const newValue = e.target.value.replace(/\D/g, "").slice(0, 8);
            setPassword(newValue);
          }}
          placeholder="내 주문 조회 시 필요한 비밀번호에요."
          className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>
      {selectedPharmacy && (
        <div className="px-4 mt-8">
          <div className="flex justify-start items-center gap-3">
            <h2 className="text-lg font-bold text-gray-800">약국 정보</h2>
            <button
              onClick={() => setShowPharmacyDetail(true)}
              className="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full text-xs text-gray-400 hover:text-gray-500"
            >
              사업자 정보
            </button>
          </div>
          <div className="mt-3">
            <div className="flex items-center">
              <span className="w-24 text-sm font-medium text-gray-600">
                약국명
              </span>
              <p className="flex-1 text-sm sm:text-base font-semibold text-gray-800">
                {selectedPharmacy.name}
              </p>
            </div>
            <div className="flex items-start mt-2">
              <span className="w-24 text-sm font-medium text-gray-600">
                약국 주소
              </span>
              <p className="flex-1 text-sm sm:text-base text-gray-700">
                {selectedPharmacy.address}
              </p>
            </div>
            <div className="flex items-center mt-2">
              <span className="w-24 text-sm font-medium text-gray-600">
                전화번호
              </span>
              <p className="flex-1 text-sm sm:text-base text-gray-700">
                {selectedPharmacy.phone || "없음"}
              </p>
            </div>
          </div>
          {showPharmacyDetail && (
            <div
              className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-40"
              onClick={() => setShowPharmacyDetail(false)}
            >
              <div
                className="relative bg-white rounded-lg shadow-lg w-full sm:w-1/2 max-w-[480px] px-6 py-8 mx-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
                  onClick={() => setShowPharmacyDetail(false)}
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  사업자 정보
                </h3>
                <div className="mt-3">
                  {selectedPharmacy.representativeName && (
                    <div className="flex items-center">
                      <span className="w-24 text-sm font-medium text-gray-600">
                        대표자명
                      </span>
                      <p className="flex-1 text-sm sm:text-base font-semibold text-gray-800">
                        {selectedPharmacy.representativeName}
                      </p>
                    </div>
                  )}
                  {selectedPharmacy.name && (
                    <div className="flex items-center mt-2">
                      <span className="w-24 text-sm font-medium text-gray-600">
                        상호명
                      </span>
                      <p className="flex-1 text-sm sm:text-base font-semibold text-gray-800">
                        {selectedPharmacy.name}
                      </p>
                    </div>
                  )}
                  {selectedPharmacy.address && (
                    <div className="flex items-start mt-2">
                      <span className="w-24 text-sm font-medium text-gray-600">
                        사업자주소
                      </span>
                      <p className="flex-1 text-sm sm:text-base text-gray-700">
                        {selectedPharmacy.address}
                      </p>
                    </div>
                  )}
                  {selectedPharmacy.registrationNumber && (
                    <div className="flex items-center mt-2">
                      <span className="w-24 text-sm font-medium text-gray-600">
                        사업자등록번호
                      </span>
                      <p className="flex-1 text-sm sm:text-base text-gray-700">
                        {selectedPharmacy.registrationNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <h2 className="text-lg font-bold p-4 mt-2">결제 방법</h2>
      <div className="px-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="paymentMethod"
            value="inicis"
            className="w-5 h-5 text-sky-500 border-gray-300"
            onChange={() => setSelectedPaymentMethod("inicis")}
            defaultChecked={true}
          />
          <span className="text-base font-medium text-gray-700">
            신용/체크카드
          </span>
        </label>
        {loginStatus.isTestLoggedIn && (
          <>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                value="kpn"
                className="w-5 h-5 text-sky-500 border-gray-300"
                onChange={() => setSelectedPaymentMethod("kpn")}
              />
              <div className="flex flex-row gap-1.5 items-center justify-center">
                <span className="text-base font-medium text-gray-700">
                  한국결제네트웍스
                </span>
                <div className="bg-orange-400 px-2 rounded-full ">
                  <span className="text-xs font-bold text-white">
                    테스트 결제
                  </span>
                </div>
              </div>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                value="kakao"
                className="w-5 h-5 text-sky-500 border-gray-300"
                onChange={() => setSelectedPaymentMethod("kakao")}
              />
              <div className="flex flex-row gap-1.5 items-center justify-center">
                <div className="relative w-12 h-6 ml-2.5">
                  <Image
                    src="/kakaopay.svg"
                    alt="카카오페이 아이콘"
                    fill
                    sizes="128px"
                    className="object-contain"
                  />
                </div>
                <span className="text-base font-medium text-gray-700">
                  카카오페이
                </span>
                <div className="bg-orange-400 px-2 rounded-full ">
                  <span className="text-xs font-bold text-white">
                    테스트 결제
                  </span>
                </div>
              </div>
            </label>
          </>
        )}
      </div>
      <h2 className="text-lg font-bold p-4 mt-2">최종 금액</h2>
      <div className={`px-4 ${totalPrice <= 0 ? "mb-24 pb-2" : ""}`}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">상품 합계</span>
          <span className="font-bold">{totalPrice.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm font-medium text-gray-700">배송비</span>
          <span className="font-bold">{deliveryFee.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between items-center border-t pt-4 mt-4">
          <span className="text-lg font-bold text-gray-900">최종 금액</span>
          <span className="text-lg font-bold text-sky-500">
            {totalPriceWithDelivery.toLocaleString()}원
          </span>
        </div>
      </div>
      {totalPrice <= 0 ? (
        <div
          className={`px-6 fixed bottom-0 left-0 right-0 w-full max-w-[640px] mx-auto ${
            totalPrice <= 0 ? "bg-gray-400" : "bg-sky-400"
          } text-white p-4 flex justify-between items-center text-lg font-bold`}
        >
          <span className="font-bold">{totalPrice.toLocaleString()}원</span>
          <span className="text-sm text-white py-3">
            상품을 1개만 담으면 주문할 수 있어요.
          </span>
        </div>
      ) : (
        <div className="px-4 mt-6">
          <button
            onClick={() => {
              if (!sdkLoaded || !(window as any).IMP) {
                alert(
                  "결제 모듈을 불러오는 데 실패하였습니다. 페이지를 새로고침해 주세요."
                );
                return;
              }
              const isValidPhone = /^[0-9]{3}-[0-9]{4}-[0-9]{4}$/.test(
                userContact
              );
              if (!phonePart1 || !phonePart2 || !phonePart3) {
                alert("전화번호를 입력해 주세요.");
                return;
              }
              if (!isValidPhone) {
                alert("전화번호를 올바른 형식으로 입력해 주세요.");
                return;
              }
              if (!password) {
                alert("주문 조회 비밀번호를 입력해 주세요.");
                return;
              }
              if (password.length < 4) {
                alert("비밀번호는 최소한 4자리 이상으로 입력해 주세요.");
                return;
              }
              if (!selectedPaymentMethod) {
                alert("결제 수단을 선택해 주세요.");
                return;
              }
              setShowModal(true);
            }}
            className="w-full bg-sky-400 text-white py-2.5 sm:py-3 rounded-lg font-bold hover:bg-sky-500 transition"
          >
            결제하기
          </button>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="mx-2 bg-white rounded-lg shadow-lg w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4">
              <h2 className="text-base font-medium text-gray-800">
                주소와 연락처가 확실한가요?
              </h2>
              <p className="text-sm text-gray-600 mt-2">
                <span className="font-medium text-gray-700">주소:</span>{" "}
                <span className="font-bold">
                  {roadAddress} {detailAddress}
                </span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium text-gray-700">연락처:</span>{" "}
                <span className="font-bold">{userContact}</span>
              </p>
            </div>
            <div className="flex border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="w-1/2 text-sm text-gray-500 py-3 hover:bg-gray-100 transition"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  handlePayment();
                }}
                className="w-1/2 text-sm text-sky-500 py-3 font-medium hover:bg-sky-50 transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
