"use client";

import { useCallback, useEffect, useMemo, useState, FormEvent } from "react";
import axios from "axios";
import OrderDetails from "@/components/order/orderDetails";
import PhoneVerifyModal from "@/app/me/phoneVerifyModal";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

type LookupConfig = {
  phone: string;
  password?: string;
  mode: "phone-password" | "phone-only";
};

function formatPhoneDisplay(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export default function MyOrders() {
  const [phonePart1, setPhonePart1] = useState("010");
  const [phonePart2, setPhonePart2] = useState("");
  const [phonePart3, setPhonePart3] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isViewingDetails, setIsViewingDetails] = useState<LookupConfig | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [dismissedLinkedView, setDismissedLinkedView] = useState(false);

  const [linkedPhone, setLinkedPhone] = useState("");
  const [linkedAt, setLinkedAt] = useState<string | undefined>();
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [phoneStatusLoading, setPhoneStatusLoading] = useState(true);
  const [phoneStatusError, setPhoneStatusError] = useState<string | null>(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    setPhonePart1(localStorage.getItem("my-orders-phonePart1") || "010");
    setPhonePart2(localStorage.getItem("my-orders-phonePart2") || "");
    setPhonePart3(localStorage.getItem("my-orders-phonePart3") || "");
    setPassword(localStorage.getItem("my-orders-password") || "");
  }, []);

  const manualPhone = useMemo(
    () => `${phonePart1}-${phonePart2}-${phonePart3}`,
    [phonePart1, phonePart2, phonePart3]
  );
  const manualPhoneDisplay = useMemo(
    () => formatPhoneDisplay(manualPhone),
    [manualPhone]
  );

  const linkedPhoneDisplay = useMemo(
    () => formatPhoneDisplay(linkedPhone),
    [linkedPhone]
  );
  const linkedPhoneNormalized = useMemo(
    () => linkedPhone.replace(/\D/g, ""),
    [linkedPhone]
  );
  const isPhoneLinked = useMemo(
    () => Boolean(linkedPhone && linkedAt),
    [linkedPhone, linkedAt]
  );

  const fetchPhoneStatus = useCallback(async () => {
    setPhoneStatusLoading(true);
    setPhoneStatusError(null);

    try {
      const res = await fetch("/api/me/phone-status", {
        headers: { "Cache-Control": "no-store" },
      });

      const raw = await res.text();
      let data: { ok?: boolean; phone?: string; linkedAt?: string } = {};

      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        data = { ok: false };
      }

      if (!res.ok || data.ok === false) {
        setLinkedPhone("");
        setLinkedAt(undefined);
        if (res.status !== 401) {
          setPhoneStatusError(
            data?.ok === false
              ? "전화번호 정보를 불러오지 못했어요."
              : raw || `HTTP ${res.status}`
          );
        }
        return;
      }

      setLinkedPhone(typeof data.phone === "string" ? data.phone : "");
      setLinkedAt(
        typeof data.linkedAt === "string" ? data.linkedAt : undefined
      );

      setDismissedLinkedView(false);
    } catch (err) {
      setPhoneStatusError(err instanceof Error ? err.message : String(err));
      setLinkedPhone("");
      setLinkedAt(undefined);
    } finally {
      setPhoneStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhoneStatus();
  }, [fetchPhoneStatus]);

  useEffect(() => {
    if (
      isPhoneLinked &&
      !phoneStatusLoading &&
      !isViewingDetails &&
      !dismissedLinkedView
    ) {
      setIsViewingDetails({
        phone: linkedPhoneNormalized,
        password: "",
        mode: "phone-only",
      });
    }
  }, [
    isPhoneLinked,
    phoneStatusLoading,
    isViewingDetails,
    dismissedLinkedView,
    linkedPhoneNormalized,
  ]);

  const handleUnlinkPhone = useCallback(async () => {
    if (unlinkLoading) return;

    setUnlinkLoading(true);
    setUnlinkError(null);

    try {
      const res = await fetch("/api/me/unlink-phone", {
        method: "POST",
        headers: { "Cache-Control": "no-store" },
      });
      const raw = await res.text();
      let data: { ok?: boolean; error?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        data = { ok: false, error: raw || `HTTP ${res.status}` };
      }

      if (!res.ok || data.ok === false) {
        setUnlinkError(data.error || "전화번호 연결 해제에 실패했어요.");
        return;
      }

      setLinkedPhone("");
      setLinkedAt(undefined);
      setIsVerifyOpen(false);
      fetchPhoneStatus();
    } catch (err) {
      setUnlinkError(err instanceof Error ? err.message : String(err));
    } finally {
      setUnlinkLoading(false);
    }
  }, [unlinkLoading, fetchPhoneStatus]);

  const handleManualLookup = async () => {
    if (!phonePart2 || !phonePart3 || !password) {
      setError("전화번호와 비밀번호를 모두 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await axios.post("/api/orders-by-phone", {
        phone: manualPhone,
        password,
      });
      if (response.data.isOrderExists) {
        setIsViewingDetails({
          phone: manualPhone,
          password,
          mode: "phone-password",
        });
      } else {
        setError("해당 전화번호와 비밀번호로 조회된 주문이 없습니다.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "주문 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedLookup = () => {
    if (!isPhoneLinked || phoneStatusLoading) return;
    setError("");
    setDismissedLinkedView(false);
    setIsViewingDetails({
      phone: linkedPhoneNormalized,
      password: "",
      mode: "phone-only",
    });
  };

  const onSubmitManual = (e: FormEvent) => {
    e.preventDefault();
    handleManualLookup();
  };

  if (isViewingDetails) {
    return (
      <div className="w-full mt-8 mb-12 flex justify-center px-2 sm:px-4">
        <div className="w-full sm:w-[640px]">
          {isPhoneLinked ? (
            <section className="rounded-2xl bg-gray-50 px-5 py-5 ring-1 ring-gray-200 mb-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">
                    인증된 번호
                  </div>
                  <div className="mt-1 text-lg font-bold text-gray-900 break-words">
                    {linkedPhoneDisplay}
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    현재 인증된 번호로 주문을 불러왔어요. 번호를 바꾸거나 다른
                    번호로 조회할 수 있어요.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setIsVerifyOpen(true);
                      setUnlinkError(null);
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-sky-700 ring-1 ring-sky-200 hover:bg-sky-50"
                  >
                    번호 변경하기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDismissedLinkedView(true);
                      setIsViewingDetails(null);
                      setError("");
                    }}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-800"
                  >
                    다른 번호로 조회하기
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          <OrderDetails
            phone={isViewingDetails.phone}
            password={isViewingDetails.password}
            lookupMode={isViewingDetails.mode}
            onBack={() => {
              setIsViewingDetails(null);
              setDismissedLinkedView(true);
            }}
          />

          <PhoneVerifyModal
            open={isVerifyOpen}
            onClose={() => {
              if (unlinkLoading) return;
              setIsVerifyOpen(false);
            }}
            initialPhone={linkedPhone}
            initialLinkedAt={linkedAt}
            allowUnlink={isPhoneLinked}
            unlinkLoading={unlinkLoading}
            unlinkError={unlinkError}
            onUnlink={async () => {
              await handleUnlinkPhone();
              setIsViewingDetails(null);
            }}
            onLinked={(nextPhone, nextLinkedAt) => {
              setLinkedPhone(nextPhone);
              setLinkedAt(nextLinkedAt);
              setIsVerifyOpen(false);
              setUnlinkError(null);
              setDismissedLinkedView(false);
              setIsViewingDetails({
                phone: nextPhone.replace(/\D/g, ""),
                password: "",
                mode: "phone-only",
              });
              fetchPhoneStatus();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-8 mb-12 flex justify-center px-2 sm:px-4">
      <div className="w-full sm:w-[640px]">
        <div className="w-full px-6 py-8 bg-white sm:shadow-md sm:rounded-2xl border border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">내 주문 조회</h1>
              <p className="mt-2 text-sm text-gray-600">
                전화번호 인증과 주문 비밀번호로 더 쉽고 빠르게 주문을 확인해요.
              </p>
            </div>
          </div>

          <section className="mt-8 rounded-2xl bg-gray-50 px-5 py-6 ring-1 ring-gray-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-bold text-gray-900">
                  인증된 전화번호로 바로 조회
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  카카오 로그인 계정에 연결된 번호가 있다면 즉시 주문 내역을
                  보여드려요.
                </p>
              </div>
              {phoneStatusLoading ? (
                <div className="h-9 w-9 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin" />
              ) : null}
            </div>

            <div className="mt-5 rounded-xl bg-white ring-1 ring-gray-200 p-4 sm:p-5">
              {phoneStatusError ? (
                <div className="text-sm text-red-600">{phoneStatusError}</div>
              ) : null}

              {isPhoneLinked ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-500">연결된 번호</div>
                    <div className="mt-1 text-xl font-bold text-gray-900">
                      {linkedPhoneDisplay}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      인증된 번호가 맞다면 버튼을 눌러 바로 조회하세요.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setIsVerifyOpen(true);
                        setUnlinkError(null);
                      }}
                      className="mt-3 inline-flex items-center text-xs font-semibold text-sky-600 hover:text-sky-700"
                    >
                      번호 변경 또는 재인증하기
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <button
                      type="button"
                      onClick={handleLinkedLookup}
                      disabled={phoneStatusLoading}
                      className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-lg bg-sky-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      인증된 번호로 주문 조회
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDismissedLinkedView(true);
                        document
                          .getElementById("manual-form")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="text-xs font-semibold text-gray-600 hover:text-gray-800"
                    >
                      이 전화번호가 아닌가요?
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      아직 인증된 전화번호가 없어요.
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      전화번호를 인증하면 비밀번호 없이도 주문을 바로 확인할 수
                      있어요.
                    </p>
                  </div>
                  <div className="flex gap-2 sm:flex-col sm:items-end sm:gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUnlinkError(null);
                        setIsVerifyOpen(true);
                      }}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-600"
                    >
                      전화번호 인증하기
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById("manual-form")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                      className="text-xs font-semibold text-gray-600 hover:text-gray-800"
                    >
                      인증 없이 다른 번호로 조회하기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section
            id="manual-form"
            className="mt-8 rounded-2xl bg-white ring-1 ring-gray-200 p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  다른 전화번호로 주문 조회
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  결제 시 입력한 전화번호와 주문 조회 비밀번호를 입력해주세요.
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                인증 없이도 가능
              </span>
            </div>

            <form className="mt-6 space-y-5" onSubmit={onSubmitManual}>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    연락처
                  </h3>
                  <span className="text-xs text-gray-500">
                    {manualPhoneDisplay}
                  </span>
                </div>
                <div className="mt-2 flex gap-2 items-center">
                  <input
                    type="text"
                    autoComplete="tel"
                    maxLength={3}
                    value={phonePart1}
                    onChange={(e) => {
                      const newValue = e.target.value.replace(/\D/g, "");
                      setPhonePart1(newValue);
                      localStorage.setItem("my-orders-phonePart1", newValue);
                      if (newValue.length === 3) {
                        document.getElementById("phonePart2")?.focus();
                      }
                    }}
                    className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-14 border rounded-md px-2 py-2 text-center text-sm transition-colors ${
                      phonePart1.length === 3 ? "bg-gray-100 text-gray-500" : ""
                    }`}
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    id="phonePart2"
                    type="text"
                    autoComplete="tel"
                    maxLength={4}
                    value={phonePart2}
                    onChange={(e) => {
                      const newValue = e.target.value.replace(/\D/g, "");
                      setPhonePart2(newValue);
                      localStorage.setItem("my-orders-phonePart2", newValue);
                      if (newValue.length === 4) {
                        document.getElementById("phonePart3")?.focus();
                      }
                    }}
                    className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-20 border rounded-md px-2 py-2 text-center text-sm transition-colors ${
                      phonePart2.length === 4 ? "bg-gray-100 text-gray-500" : ""
                    }`}
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    id="phonePart3"
                    type="text"
                    autoComplete="tel"
                    maxLength={4}
                    value={phonePart3}
                    onChange={(e) => {
                      const newValue = e.target.value.replace(/\D/g, "");
                      setPhonePart3(newValue);
                      localStorage.setItem("my-orders-phonePart3", newValue);
                    }}
                    className={`focus:outline-none focus:ring-2 focus:ring-sky-400 w-20 border rounded-md px-2 py-2 text-center text-sm transition-colors ${
                      phonePart3.length === 4 ? "bg-gray-100 text-gray-500" : ""
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    주문 조회 비밀번호
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                  >
                    {showPw ? "비밀번호 가리기" : "비밀번호 보기"}
                  </button>
                </div>
                <div className="relative mt-2">
                  <input
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      localStorage.setItem(
                        "my-orders-password",
                        e.target.value
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleManualLookup();
                      }
                    }}
                    placeholder="주문 시 입력한 비밀번호"
                    className="w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                    aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                    tabIndex={-1}
                  >
                    {showPw ? (
                      <EyeSlashIcon className="w-5 h-5 text-gray-600" />
                    ) : (
                      <EyeIcon className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  className={`w-full h-11 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition ${
                    loading ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      주문 조회 중...
                    </div>
                  ) : (
                    "해당 정보로 주문 조회"
                  )}
                </button>
              </div>

              {error && (
                <p className="text-red-500 text-sm mt-2" role="alert">
                  {error}
                </p>
              )}
            </form>
          </section>
        </div>

        <PhoneVerifyModal
          open={isVerifyOpen}
          onClose={() => {
            if (unlinkLoading) return;
            setIsVerifyOpen(false);
          }}
          initialPhone={linkedPhone}
          initialLinkedAt={linkedAt}
          allowUnlink={isPhoneLinked}
          unlinkLoading={unlinkLoading}
          unlinkError={unlinkError}
          onUnlink={handleUnlinkPhone}
          onLinked={(nextPhone, nextLinkedAt) => {
            setLinkedPhone(nextPhone);
            setLinkedAt(nextLinkedAt);
            setIsVerifyOpen(false);
            setUnlinkError(null);
            fetchPhoneStatus();
          }}
        />
      </div>
    </div>
  );
}
