import { NextResponse } from "next/server";
import { headers as nextHeaders, cookies as nextCookies } from "next/headers";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { ensureClient } from "@/lib/server/client";
import { normalizePhone } from "@/lib/otp";
import { CLIENT_COOKIE_NAME, isValidClientIdValue } from "@/lib/shared/client-id";
import {
  B2B_EMPLOYEE_TOKEN_COOKIE,
  verifyB2bEmployeeAccessToken,
} from "@/lib/b2b/employee-token";

type GuardSuccess<T> = { ok: true; data: T };
type GuardFailure = { ok: false; response: NextResponse };
type GuardResult<T> = GuardSuccess<T> | GuardFailure;

function jsonError(status: number, message: string) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function unauthorized(message = "Unauthorized"): GuardFailure {
  return { ok: false, response: jsonError(401, message) };
}

function badRequest(message = "Invalid request"): GuardFailure {
  return { ok: false, response: jsonError(400, message) };
}

function normalizePhoneLoose(value: string | null | undefined): string {
  return normalizePhone(value ?? "").replace(/\D/g, "");
}

function toGuestKakaoId(clientId: string) {
  return `guest:cid:${clientId}`;
}

async function ensureGuestAppUser(clientId: string) {
  const guestKakaoId = toGuestKakaoId(clientId);
  return db.appUser.upsert({
    where: { kakaoId: guestKakaoId },
    create: {
      kakaoId: guestKakaoId,
      clientId,
    },
    update: {
      clientId,
    },
    select: { id: true, phone: true },
  });
}

async function resolveLoggedInAppUser() {
  const session = await getSession();
  if (!session.user?.loggedIn || typeof session.user.kakaoId !== "number") {
    return { session, appUser: null };
  }
  const appUser = await db.appUser.findUnique({
    where: { kakaoId: String(session.user.kakaoId) },
    select: { id: true, phone: true },
  });
  return { session, appUser };
}

async function ensureAppUserForKakaoId(kakaoId: string) {
  return db.appUser.upsert({
    where: { kakaoId },
    create: { kakaoId },
    update: {},
    select: { id: true, phone: true },
  });
}

export async function requireAdminSession(): Promise<GuardResult<null>> {
  const session = await getSession();
  if (!session.admin?.loggedIn) return unauthorized();
  return { ok: true, data: null };
}

export async function requireCronSecret(
  req: Request
): Promise<GuardResult<null>> {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return {
      ok: false,
      response: jsonError(500, "CRON_SECRET is not configured"),
    };
  }

  const authHeader = req.headers.get("authorization");
  const expectedHeader = `Bearer ${expectedSecret}`;
  if (authHeader !== expectedHeader) {
    return unauthorized("Unauthorized cron request");
  }

  return { ok: true, data: null };
}

export async function requireAnySession(): Promise<GuardResult<null>> {
  const session = await getSession();
  const hasSession =
    !!session.admin?.loggedIn ||
    !!session.test?.loggedIn ||
    !!session.pharm?.loggedIn ||
    !!session.rider?.loggedIn ||
    (!!session.user?.loggedIn && typeof session.user.kakaoId === "number");
  if (!hasSession) return unauthorized();
  return { ok: true, data: null };
}

export async function requireUserSession(): Promise<
  GuardResult<{ appUserId: string; kakaoId: string; phone: string | null }>
> {
  const { session, appUser } = await resolveLoggedInAppUser();
  if (!session.user?.loggedIn || typeof session.user.kakaoId !== "number") {
    return unauthorized();
  }
  const kakaoId = String(session.user.kakaoId);
  const resolvedAppUser = appUser ?? (await ensureAppUserForKakaoId(kakaoId));
  return {
    ok: true,
    data: {
      appUserId: resolvedAppUser.id,
      kakaoId,
      phone: resolvedAppUser.phone ?? null,
    },
  };
}

export async function requireNhisSession(): Promise<
  GuardResult<{
    appUserId: string;
    kakaoId: string | null;
    phone: string | null;
    loggedIn: boolean;
    guest: boolean;
    clientId: string | null;
  }>
> {
  const { session, appUser } = await resolveLoggedInAppUser();
  if (session.user?.loggedIn && typeof session.user.kakaoId === "number") {
    const kakaoId = String(session.user.kakaoId);
    const resolvedAppUser =
      appUser ??
      (await db.appUser.upsert({
        where: { kakaoId },
        create: { kakaoId },
        update: {},
        select: { id: true, phone: true },
      }));

    return {
      ok: true,
      data: {
        appUserId: resolvedAppUser.id,
        kakaoId,
        phone: resolvedAppUser.phone ?? null,
        loggedIn: true,
        guest: false,
        clientId: null,
      },
    };
  }

  const cookieStore = await nextCookies();
  const clientIdRaw = cookieStore.get(CLIENT_COOKIE_NAME)?.value ?? null;
  if (!isValidClientIdValue(clientIdRaw)) {
    return unauthorized("Client session is required");
  }

  const h = await nextHeaders();
  await ensureClient(clientIdRaw, {
    userAgent: h.get("user-agent"),
  });
  const guestAppUser = await ensureGuestAppUser(clientIdRaw);

  return {
    ok: true,
    data: {
      appUserId: guestAppUser.id,
      kakaoId: null,
      phone: guestAppUser.phone ?? null,
      loggedIn: false,
      guest: true,
      clientId: clientIdRaw,
    },
  };
}

export async function requirePharmSession(
  expectedPharmacyId?: number
): Promise<GuardResult<{ pharmacyId: number }>> {
  const session = await getSession();
  const pharmacyId = session.pharm?.id;
  if (!session.pharm?.loggedIn || !Number.isFinite(pharmacyId)) {
    return unauthorized();
  }
  if (
    Number.isFinite(expectedPharmacyId) &&
    Number(pharmacyId) !== Number(expectedPharmacyId)
  ) {
    return unauthorized();
  }
  return { ok: true, data: { pharmacyId: Number(pharmacyId) } };
}

export async function requireRiderSession(
  expectedRiderId?: number
): Promise<GuardResult<{ riderId: number }>> {
  const session = await getSession();
  const riderId = session.rider?.id;
  if (!session.rider?.loggedIn || !Number.isFinite(riderId)) {
    return unauthorized();
  }
  if (
    Number.isFinite(expectedRiderId) &&
    Number(riderId) !== Number(expectedRiderId)
  ) {
    return unauthorized();
  }
  return { ok: true, data: { riderId: Number(riderId) } };
}

type OrderAccessOrder = {
  id: number;
  appUserId: string | null;
  phone: string | null;
  pharmacyId: number | null;
  riderId: number | null;
};

async function getOrderAccessRow(
  orderId: number
): Promise<OrderAccessOrder | null> {
  return db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      appUserId: true,
      phone: true,
      pharmacyId: true,
      riderId: true,
    },
  });
}

export async function requireCustomerOrderAccess(
  orderId: number
): Promise<GuardResult<{ order: OrderAccessOrder; appUserId: string }>> {
  if (!Number.isFinite(orderId)) return badRequest("Invalid orderId");

  const { appUser } = await resolveLoggedInAppUser();
  if (!appUser) return unauthorized();

  const order = await getOrderAccessRow(Number(orderId));
  if (!order) return { ok: false, response: jsonError(404, "Order not found") };

  const orderPhone = normalizePhoneLoose(order.phone);
  const userPhone = normalizePhoneLoose(appUser.phone);
  const ownsById = !!order.appUserId && order.appUserId === appUser.id;
  const ownsByPhone = !!orderPhone && !!userPhone && orderPhone === userPhone;

  if (!ownsById && !ownsByPhone) return unauthorized();

  return { ok: true, data: { order, appUserId: appUser.id } };
}

export async function requireB2bEmployeeToken(): Promise<
  GuardResult<{ employeeId: string; identityHash: string }>
> {
  const cookieStore = await nextCookies();
  const token = cookieStore.get(B2B_EMPLOYEE_TOKEN_COOKIE)?.value;
  const payload = verifyB2bEmployeeAccessToken(token);
  if (!payload) return unauthorized("임직원 인증이 필요합니다.");

  const employee = await db.b2bEmployee.findUnique({
    where: { id: payload.employeeId },
    select: { id: true, identityHash: true },
  });
  if (!employee) return unauthorized("임직원 정보를 찾을 수 없습니다.");
  if (employee.identityHash !== payload.identityHash) {
    return unauthorized("임직원 인증이 만료되었습니다.");
  }

  return {
    ok: true,
    data: {
      employeeId: employee.id,
      identityHash: employee.identityHash,
    },
  };
}
