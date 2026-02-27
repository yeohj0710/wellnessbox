import "server-only";

import { NextResponse } from "next/server";
import {
  getPharmacySubscriptionStatus,
  getRiderSubscriptionStatus,
  getSubscriptionStatus,
  removePharmacySubscription,
  removeRiderSubscription,
  removeSubscription,
  removePharmacySubscriptionsByEndpointExcept,
  removeRiderSubscriptionsByEndpointExcept,
  removeSubscriptionsByEndpointExceptRole,
  savePharmacySubscription,
  saveRiderSubscription,
  saveSubscription,
} from "@/lib/notification";
import {
  requireCustomerOrderAccess,
  requirePharmSession,
  requireRiderSession,
} from "@/lib/server/route-auth";

type PushSubscriptionPayload = {
  endpoint: string;
  keys?: {
    auth?: string;
    p256dh?: string;
  };
};

type CustomerPushSubscribePayload = {
  orderId: number;
  subscription: PushSubscriptionPayload;
  role: "customer";
};

type PharmPushSubscribePayload = {
  pharmacyId: number;
  subscription: PushSubscriptionPayload;
  role: "pharm";
};

type RiderPushSubscribePayload = {
  riderId: number;
  subscription: PushSubscriptionPayload;
  role: "rider";
};

type CustomerPushTargetPayload = {
  orderId: number;
  endpoint: string;
  role: "customer";
};

type PharmPushTargetPayload = {
  pharmacyId: number;
  endpoint: string;
  role: "pharm";
};

type RiderPushTargetPayload = {
  riderId: number;
  endpoint: string;
  role: "rider";
};

function parseSubscription(input: unknown): PushSubscriptionPayload | null {
  if (!input || typeof input !== "object") return null;
  const endpoint = (input as { endpoint?: unknown }).endpoint;
  if (typeof endpoint !== "string") return null;
  return input as PushSubscriptionPayload;
}

function parseEndpoint(input: unknown) {
  return typeof input === "string" ? input : null;
}

export function parseCustomerPushSubscribeBody(
  raw: unknown
): CustomerPushSubscribePayload | null {
  const orderId = Number((raw as { orderId?: unknown })?.orderId);
  const role = (raw as { role?: unknown })?.role;
  const subscription = parseSubscription((raw as { subscription?: unknown })?.subscription);
  if (!Number.isFinite(orderId) || role !== "customer" || !subscription) return null;

  return {
    orderId,
    role,
    subscription,
  };
}

export function parsePharmPushSubscribeBody(
  raw: unknown
): PharmPushSubscribePayload | null {
  const pharmacyId = Number((raw as { pharmacyId?: unknown })?.pharmacyId);
  const role = (raw as { role?: unknown })?.role;
  const subscription = parseSubscription((raw as { subscription?: unknown })?.subscription);
  if (!Number.isFinite(pharmacyId) || role !== "pharm" || !subscription) return null;

  return {
    pharmacyId,
    role,
    subscription,
  };
}

export function parseRiderPushSubscribeBody(
  raw: unknown
): RiderPushSubscribePayload | null {
  const riderId = Number((raw as { riderId?: unknown })?.riderId);
  const role = (raw as { role?: unknown })?.role;
  const subscription = parseSubscription((raw as { subscription?: unknown })?.subscription);
  if (!Number.isFinite(riderId) || role !== "rider" || !subscription) return null;

  return {
    riderId,
    role,
    subscription,
  };
}

export function parseCustomerPushTargetBody(
  raw: unknown
): CustomerPushTargetPayload | null {
  const orderId = Number((raw as { orderId?: unknown })?.orderId);
  const endpoint = parseEndpoint((raw as { endpoint?: unknown })?.endpoint);
  const role = (raw as { role?: unknown })?.role;
  if (!Number.isFinite(orderId) || !endpoint || role !== "customer") return null;

  return { orderId, endpoint, role };
}

export function parsePharmPushTargetBody(
  raw: unknown
): PharmPushTargetPayload | null {
  const pharmacyId = Number((raw as { pharmacyId?: unknown })?.pharmacyId);
  const endpoint = parseEndpoint((raw as { endpoint?: unknown })?.endpoint);
  const role = (raw as { role?: unknown })?.role;
  if (!Number.isFinite(pharmacyId) || !endpoint || role !== "pharm") return null;

  return { pharmacyId, endpoint, role };
}

export function parseRiderPushTargetBody(
  raw: unknown
): RiderPushTargetPayload | null {
  const riderId = Number((raw as { riderId?: unknown })?.riderId);
  const endpoint = parseEndpoint((raw as { endpoint?: unknown })?.endpoint);
  const role = (raw as { role?: unknown })?.role;
  if (!Number.isFinite(riderId) || !endpoint || role !== "rider") return null;

  return { riderId, endpoint, role };
}

export async function runCustomerPushSubscribeAuthorized(
  payload: CustomerPushSubscribePayload
) {
  await removeSubscriptionsByEndpointExceptRole(
    payload.subscription.endpoint,
    payload.role
  );
  await saveSubscription(payload.orderId, payload.subscription, payload.role);
  return NextResponse.json({ ok: true });
}

export async function runPharmPushSubscribeAuthorized(
  payload: PharmPushSubscribePayload
) {
  await removeSubscriptionsByEndpointExceptRole(
    payload.subscription.endpoint,
    payload.role
  );
  await removePharmacySubscriptionsByEndpointExcept(
    payload.subscription.endpoint,
    payload.pharmacyId
  );
  await savePharmacySubscription(payload.pharmacyId, payload.subscription);
  return NextResponse.json({ ok: true });
}

export async function runRiderPushSubscribeAuthorized(
  payload: RiderPushSubscribePayload
) {
  await removeSubscriptionsByEndpointExceptRole(
    payload.subscription.endpoint,
    payload.role
  );
  await removeRiderSubscriptionsByEndpointExcept(
    payload.subscription.endpoint,
    payload.riderId
  );
  await saveRiderSubscription(payload.riderId, payload.subscription);
  return NextResponse.json({ ok: true });
}

export async function runCustomerPushSubscribePostRoute(req: Request) {
  try {
    const parsed = parseCustomerPushSubscribeBody(await req.json());
    if (!parsed) return buildPushSubscribeBadRequestResponse();

    const auth = await requireCustomerOrderAccess(parsed.orderId);
    if (!auth.ok) return auth.response;
    return runCustomerPushSubscribeAuthorized(parsed);
  } catch (error) {
    return buildPushSubscribeServerErrorResponse(error);
  }
}

export async function runPharmPushSubscribePostRoute(req: Request) {
  try {
    const parsed = parsePharmPushSubscribeBody(await req.json());
    if (!parsed) return buildPushSubscribeBadRequestResponse();

    const auth = await requirePharmSession(parsed.pharmacyId);
    if (!auth.ok) return auth.response;
    return runPharmPushSubscribeAuthorized({
      ...parsed,
      pharmacyId: auth.data.pharmacyId,
    });
  } catch (error) {
    return buildPushSubscribeServerErrorResponse(error);
  }
}

export async function runRiderPushSubscribePostRoute(req: Request) {
  try {
    const parsed = parseRiderPushSubscribeBody(await req.json());
    if (!parsed) return buildPushSubscribeBadRequestResponse();

    const auth = await requireRiderSession(parsed.riderId);
    if (!auth.ok) return auth.response;
    return runRiderPushSubscribeAuthorized({
      ...parsed,
      riderId: auth.data.riderId,
    });
  } catch (error) {
    return buildPushSubscribeServerErrorResponse(error);
  }
}

export function buildPushSubscribeBadRequestResponse() {
  return NextResponse.json({ error: "Missing params" }, { status: 400 });
}

export function buildPushSubscribeServerErrorResponse(error: unknown) {
  console.error(error);
  return NextResponse.json(
    { error: "Failed to save subscription" },
    { status: 500 }
  );
}

export function buildPushStatusServerErrorResponse(error: unknown) {
  console.error(error);
  return NextResponse.json(
    { error: "Failed to check subscription" },
    { status: 500 }
  );
}

export function buildPushUnsubscribeServerErrorResponse(error: unknown) {
  console.error(error);
  return NextResponse.json(
    { error: "Failed to remove subscription" },
    { status: 500 }
  );
}

export async function runCustomerPushStatusPostRoute(req: Request) {
  try {
    const body = await req.json();
    const parsed = parseCustomerPushTargetBody(body);
    if (!parsed) return buildPushSubscribeBadRequestResponse();

    const auth = await requireCustomerOrderAccess(parsed.orderId);
    if (!auth.ok) return auth.response;

    const status = await getSubscriptionStatus(
      parsed.orderId,
      parsed.endpoint,
      parsed.role
    );
    return NextResponse.json(status);
  } catch (error) {
    return buildPushStatusServerErrorResponse(error);
  }
}

export async function runCustomerPushUnsubscribePostRoute(req: Request) {
  try {
    const body = await req.json();
    const parsed = parseCustomerPushTargetBody(body);
    if (!parsed) return buildPushSubscribeBadRequestResponse();

    const auth = await requireCustomerOrderAccess(parsed.orderId);
    if (!auth.ok) return auth.response;

    await removeSubscription(parsed.endpoint, parsed.orderId, parsed.role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return buildPushUnsubscribeServerErrorResponse(error);
  }
}

export async function runPharmPushStatusPostRoute(req: Request) {
  try {
    const body = await req.json();
    const parsed = parsePharmPushTargetBody(body);
    if (!parsed) return buildPushSubscribeBadRequestResponse();

    const auth = await requirePharmSession(parsed.pharmacyId);
    if (!auth.ok) return auth.response;

    const status = await getPharmacySubscriptionStatus(
      auth.data.pharmacyId,
      parsed.endpoint
    );
    return NextResponse.json(status);
  } catch (error) {
    return buildPushStatusServerErrorResponse(error);
  }
}

export async function runPharmPushUnsubscribePostRoute(req: Request) {
  try {
    const body = await req.json();
    const parsed = parsePharmPushTargetBody(body);
    if (!parsed) return buildPushSubscribeBadRequestResponse();

    const auth = await requirePharmSession(parsed.pharmacyId);
    if (!auth.ok) return auth.response;

    await removePharmacySubscription(parsed.endpoint, auth.data.pharmacyId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return buildPushUnsubscribeServerErrorResponse(error);
  }
}

export async function runRiderPushStatusPostRoute(req: Request) {
  try {
    const body = await req.json();
    const parsed = parseRiderPushTargetBody(body);
    if (!parsed) return buildPushSubscribeBadRequestResponse();

    const auth = await requireRiderSession(parsed.riderId);
    if (!auth.ok) return auth.response;

    const status = await getRiderSubscriptionStatus(auth.data.riderId, parsed.endpoint);
    return NextResponse.json(status);
  } catch (error) {
    return buildPushStatusServerErrorResponse(error);
  }
}

export async function runRiderPushUnsubscribePostRoute(req: Request) {
  try {
    const body = await req.json();
    const parsed = parseRiderPushTargetBody(body);
    if (!parsed) return buildPushSubscribeBadRequestResponse();

    const auth = await requireRiderSession(parsed.riderId);
    if (!auth.ok) return auth.response;

    await removeRiderSubscription(parsed.endpoint, auth.data.riderId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return buildPushUnsubscribeServerErrorResponse(error);
  }
}
