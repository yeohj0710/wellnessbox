import {
  deleteSubscriptionsWithLog,
  getScopedSubscriptionStatus,
  isScopedSubscribed,
  PHARM_ROLE,
  removeScopedSubscription,
  removeScopedSubscriptionsByEndpointExcept,
  RIDER_ROLE,
  saveScopedSubscription,
  type PushSubscriptionPayload,
} from "./subscriptions.shared";

export async function saveSubscription(
  orderId: number,
  sub: PushSubscriptionPayload,
  role: string
) {
  return saveScopedSubscription({
    role,
    subscription: sub,
    scopeField: "orderId",
    scopeId: orderId,
    upsertWhere: {
      role_orderId_endpoint: { role, orderId, endpoint: sub.endpoint },
    },
    logEvent: "subscription.save",
    logMeta: { role, orderId },
  });
}

export async function removeSubscription(
  endpoint: string,
  orderId: number,
  role: string
) {
  return removeScopedSubscription({
    role,
    endpoint,
    scopeField: "orderId",
    scopeId: orderId,
    logEvent: "subscription.remove",
    logMeta: { role, orderId, endpoint },
  });
}

export async function removeSubscriptionsByEndpoint(
  endpoint: string,
  role: string
) {
  return deleteSubscriptionsWithLog({
    where: { endpoint, role },
    logEvent: "subscription.remove_by_endpoint",
    logMeta: { role, endpoint },
  });
}

export async function removeSubscriptionsByEndpointAll(endpoint: string) {
  return deleteSubscriptionsWithLog({
    where: { endpoint },
    logEvent: "subscription.remove_all_roles",
    logMeta: { endpoint },
  });
}

export async function removeSubscriptionsByEndpointExceptRole(
  endpoint: string,
  role: string
) {
  return deleteSubscriptionsWithLog({
    where: { endpoint, role: { not: role } },
    logEvent: "subscription.remove_except_role",
    logMeta: { role, endpoint },
  });
}

export async function isSubscribed(
  orderId: number,
  endpoint: string,
  role: string
) {
  return isScopedSubscribed(role, "orderId", orderId, endpoint);
}

export async function savePharmacySubscription(
  pharmacyId: number,
  sub: PushSubscriptionPayload
) {
  return saveScopedSubscription({
    role: PHARM_ROLE,
    subscription: sub,
    scopeField: "pharmacyId",
    scopeId: pharmacyId,
    upsertWhere: {
      role_pharmacyId_endpoint: {
        role: PHARM_ROLE,
        pharmacyId,
        endpoint: sub.endpoint,
      },
    },
    logEvent: "subscription.save_pharm",
    logMeta: { role: PHARM_ROLE, pharmacyId },
  });
}

export async function removePharmacySubscription(
  endpoint: string,
  pharmacyId: number
) {
  return removeScopedSubscription({
    role: PHARM_ROLE,
    endpoint,
    scopeField: "pharmacyId",
    scopeId: pharmacyId,
    logEvent: "subscription.remove_pharm",
    logMeta: { role: PHARM_ROLE, pharmacyId, endpoint },
  });
}

export async function removePharmacySubscriptionsByEndpointExcept(
  endpoint: string,
  pharmacyId: number
) {
  return removeScopedSubscriptionsByEndpointExcept({
    role: PHARM_ROLE,
    endpoint,
    scopeField: "pharmacyId",
    scopeId: pharmacyId,
    logEvent: "subscription.remove_pharm_except",
    logMeta: { role: PHARM_ROLE, pharmacyId, endpoint },
  });
}

export async function isPharmacySubscribed(
  pharmacyId: number,
  endpoint: string
) {
  return isScopedSubscribed(PHARM_ROLE, "pharmacyId", pharmacyId, endpoint);
}

export async function saveRiderSubscription(
  riderId: number,
  sub: PushSubscriptionPayload
) {
  return saveScopedSubscription({
    role: RIDER_ROLE,
    subscription: sub,
    scopeField: "riderId",
    scopeId: riderId,
    upsertWhere: {
      role_riderId_endpoint: {
        role: RIDER_ROLE,
        riderId,
        endpoint: sub.endpoint,
      },
    },
    logEvent: "subscription.save_rider",
    logMeta: { role: RIDER_ROLE, riderId },
  });
}

export async function removeRiderSubscription(
  endpoint: string,
  riderId: number
) {
  return removeScopedSubscription({
    role: RIDER_ROLE,
    endpoint,
    scopeField: "riderId",
    scopeId: riderId,
    logEvent: "subscription.remove_rider",
    logMeta: { role: RIDER_ROLE, riderId, endpoint },
  });
}

export async function removeRiderSubscriptionsByEndpointExcept(
  endpoint: string,
  riderId: number
) {
  return removeScopedSubscriptionsByEndpointExcept({
    role: RIDER_ROLE,
    endpoint,
    scopeField: "riderId",
    scopeId: riderId,
    logEvent: "subscription.remove_rider_except",
    logMeta: { role: RIDER_ROLE, riderId, endpoint },
  });
}

export async function isRiderSubscribed(riderId: number, endpoint: string) {
  return isScopedSubscribed(RIDER_ROLE, "riderId", riderId, endpoint);
}

export async function getSubscriptionStatus(
  orderId: number,
  endpoint: string,
  role: string
) {
  return getScopedSubscriptionStatus({
    role,
    endpoint,
    scopeField: "orderId",
    scopeId: orderId,
    logEvent: "subscription.status",
    logMeta: { role, orderId, endpoint },
  });
}

export async function getPharmacySubscriptionStatus(
  pharmacyId: number,
  endpoint: string
) {
  return getScopedSubscriptionStatus({
    role: PHARM_ROLE,
    endpoint,
    scopeField: "pharmacyId",
    scopeId: pharmacyId,
    logEvent: "subscription.status_pharm",
    logMeta: { role: PHARM_ROLE, pharmacyId, endpoint },
  });
}

export async function getRiderSubscriptionStatus(
  riderId: number,
  endpoint: string
) {
  return getScopedSubscriptionStatus({
    role: RIDER_ROLE,
    endpoint,
    scopeField: "riderId",
    scopeId: riderId,
    logEvent: "subscription.status_rider",
    logMeta: { role: RIDER_ROLE, riderId, endpoint },
  });
}
