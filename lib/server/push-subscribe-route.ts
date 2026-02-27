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
  authorizeCustomerOrder,
  authorizePharm,
  authorizeRider,
  runParsedRoute,
} from "@/lib/server/push-subscribe-auth";
import {
  parseCustomerPushSubscribeBody,
  parseCustomerPushTargetBody,
  parsePharmPushSubscribeBody,
  parsePharmPushTargetBody,
  parseRiderPushSubscribeBody,
  parseRiderPushTargetBody,
  type CustomerPushSubscribePayload,
  type CustomerPushTargetPayload,
  type PharmPushSubscribePayload,
  type PharmPushTargetPayload,
  type RiderPushSubscribePayload,
  type RiderPushTargetPayload,
} from "@/lib/server/push-subscribe-parse";

export {
  parseCustomerPushSubscribeBody,
  parseCustomerPushTargetBody,
  parsePharmPushSubscribeBody,
  parsePharmPushTargetBody,
  parseRiderPushSubscribeBody,
  parseRiderPushTargetBody,
} from "@/lib/server/push-subscribe-parse";

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

async function runCustomerPushStatusAuthorized(
  payload: CustomerPushTargetPayload
) {
  const status = await getSubscriptionStatus(
    payload.orderId,
    payload.endpoint,
    payload.role
  );
  return NextResponse.json(status);
}

async function runCustomerPushUnsubscribeAuthorized(
  payload: CustomerPushTargetPayload
) {
  await removeSubscription(payload.endpoint, payload.orderId, payload.role);
  return NextResponse.json({ ok: true });
}

async function runPharmPushStatusAuthorized(payload: PharmPushTargetPayload) {
  const status = await getPharmacySubscriptionStatus(
    payload.pharmacyId,
    payload.endpoint
  );
  return NextResponse.json(status);
}

async function runPharmPushUnsubscribeAuthorized(
  payload: PharmPushTargetPayload
) {
  await removePharmacySubscription(payload.endpoint, payload.pharmacyId);
  return NextResponse.json({ ok: true });
}

async function runRiderPushStatusAuthorized(payload: RiderPushTargetPayload) {
  const status = await getRiderSubscriptionStatus(
    payload.riderId,
    payload.endpoint
  );
  return NextResponse.json(status);
}

async function runRiderPushUnsubscribeAuthorized(
  payload: RiderPushTargetPayload
) {
  await removeRiderSubscription(payload.endpoint, payload.riderId);
  return NextResponse.json({ ok: true });
}

export async function runCustomerPushSubscribePostRoute(req: Request) {
  return runParsedRoute({
    req,
    parseBody: parseCustomerPushSubscribeBody,
    authorize: authorizeCustomerOrder,
    runAuthorized: runCustomerPushSubscribeAuthorized,
    onBadRequest: buildPushSubscribeBadRequestResponse,
    onError: buildPushSubscribeServerErrorResponse,
  });
}

export async function runPharmPushSubscribePostRoute(req: Request) {
  return runParsedRoute({
    req,
    parseBody: parsePharmPushSubscribeBody,
    authorize: authorizePharm,
    runAuthorized: runPharmPushSubscribeAuthorized,
    onBadRequest: buildPushSubscribeBadRequestResponse,
    onError: buildPushSubscribeServerErrorResponse,
  });
}

export async function runRiderPushSubscribePostRoute(req: Request) {
  return runParsedRoute({
    req,
    parseBody: parseRiderPushSubscribeBody,
    authorize: authorizeRider,
    runAuthorized: runRiderPushSubscribeAuthorized,
    onBadRequest: buildPushSubscribeBadRequestResponse,
    onError: buildPushSubscribeServerErrorResponse,
  });
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
  return runParsedRoute({
    req,
    parseBody: parseCustomerPushTargetBody,
    authorize: authorizeCustomerOrder,
    runAuthorized: runCustomerPushStatusAuthorized,
    onBadRequest: buildPushSubscribeBadRequestResponse,
    onError: buildPushStatusServerErrorResponse,
  });
}

export async function runCustomerPushUnsubscribePostRoute(req: Request) {
  return runParsedRoute({
    req,
    parseBody: parseCustomerPushTargetBody,
    authorize: authorizeCustomerOrder,
    runAuthorized: runCustomerPushUnsubscribeAuthorized,
    onBadRequest: buildPushSubscribeBadRequestResponse,
    onError: buildPushUnsubscribeServerErrorResponse,
  });
}

export async function runPharmPushStatusPostRoute(req: Request) {
  return runParsedRoute({
    req,
    parseBody: parsePharmPushTargetBody,
    authorize: authorizePharm,
    runAuthorized: runPharmPushStatusAuthorized,
    onBadRequest: buildPushSubscribeBadRequestResponse,
    onError: buildPushStatusServerErrorResponse,
  });
}

export async function runPharmPushUnsubscribePostRoute(req: Request) {
  return runParsedRoute({
    req,
    parseBody: parsePharmPushTargetBody,
    authorize: authorizePharm,
    runAuthorized: runPharmPushUnsubscribeAuthorized,
    onBadRequest: buildPushSubscribeBadRequestResponse,
    onError: buildPushUnsubscribeServerErrorResponse,
  });
}

export async function runRiderPushStatusPostRoute(req: Request) {
  return runParsedRoute({
    req,
    parseBody: parseRiderPushTargetBody,
    authorize: authorizeRider,
    runAuthorized: runRiderPushStatusAuthorized,
    onBadRequest: buildPushSubscribeBadRequestResponse,
    onError: buildPushStatusServerErrorResponse,
  });
}

export async function runRiderPushUnsubscribePostRoute(req: Request) {
  return runParsedRoute({
    req,
    parseBody: parseRiderPushTargetBody,
    authorize: authorizeRider,
    runAuthorized: runRiderPushUnsubscribeAuthorized,
    onBadRequest: buildPushSubscribeBadRequestResponse,
    onError: buildPushUnsubscribeServerErrorResponse,
  });
}
