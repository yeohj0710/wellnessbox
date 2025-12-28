export type LoginStatus = {
  isUserLoggedIn: boolean;
  isPharmLoggedIn: boolean;
  isRiderLoggedIn: boolean;
  isAdminLoggedIn: boolean;
  isTestLoggedIn: boolean;
};

const fallback: LoginStatus = {
  isUserLoggedIn: false,
  isPharmLoggedIn: false,
  isRiderLoggedIn: false,
  isAdminLoggedIn: false,
  isTestLoggedIn: false,
};

export async function getLoginStatus(
  signal?: AbortSignal
): Promise<LoginStatus> {
  const res = await fetch("/api/auth/login-status", {
    method: "GET",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
    credentials: "include",
    signal,
  });

  if (!res.ok) return fallback;

  const raw = (await res.json()) as Partial<Record<keyof LoginStatus, unknown>>;

  return {
    isUserLoggedIn: raw.isUserLoggedIn === true,
    isPharmLoggedIn: raw.isPharmLoggedIn === true,
    isRiderLoggedIn: raw.isRiderLoggedIn === true,
    isAdminLoggedIn: raw.isAdminLoggedIn === true,
    isTestLoggedIn: raw.isTestLoggedIn === true,
  };
}
