import "server-only";

import {
  requireCustomerOrderAccess,
  requirePharmSession,
  requireRiderSession,
} from "@/lib/server/route-auth";

export type AuthorizeResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      response: Response;
    };

export async function authorizeCustomerOrder<T extends { orderId: number }>(
  payload: T
): Promise<AuthorizeResult<T>> {
  const auth = await requireCustomerOrderAccess(payload.orderId);
  if (!auth.ok) {
    return { ok: false, response: auth.response };
  }
  return { ok: true, data: payload };
}

export async function authorizePharm<T extends { pharmacyId: number }>(
  payload: T
): Promise<AuthorizeResult<T>> {
  const auth = await requirePharmSession(payload.pharmacyId);
  if (!auth.ok) {
    return { ok: false, response: auth.response };
  }
  return {
    ok: true,
    data: { ...payload, pharmacyId: auth.data.pharmacyId },
  };
}

export async function authorizeRider<T extends { riderId: number }>(
  payload: T
): Promise<AuthorizeResult<T>> {
  const auth = await requireRiderSession(payload.riderId);
  if (!auth.ok) {
    return { ok: false, response: auth.response };
  }
  return {
    ok: true,
    data: { ...payload, riderId: auth.data.riderId },
  };
}

export async function runParsedRoute<TParsed, TAuthorized>(input: {
  req: Request;
  parseBody: (raw: unknown) => TParsed | null;
  authorize: (payload: TParsed) => Promise<AuthorizeResult<TAuthorized>>;
  runAuthorized: (payload: TAuthorized) => Promise<Response>;
  onBadRequest: () => Response;
  onError: (error: unknown) => Response;
}) {
  try {
    const parsed = input.parseBody(await input.req.json());
    if (!parsed) return input.onBadRequest();

    const auth = await input.authorize(parsed);
    if (!auth.ok) return auth.response;

    return input.runAuthorized(auth.data);
  } catch (error) {
    return input.onError(error);
  }
}
