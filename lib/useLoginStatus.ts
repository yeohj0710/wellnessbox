"use server";

import getSession from "./session";

export async function getLoginStatus() {
  const session = await getSession();
  return {
    isUserLoggedIn: !!session.user?.loggedIn,
    isAdminLoggedIn: !!session.admin?.loggedIn,
    isPharmLoggedIn: !!session.pharm?.loggedIn,
    isRiderLoggedIn: !!session.rider?.loggedIn,
    isTestLoggedIn: !!session.test?.loggedIn,
  };
}
