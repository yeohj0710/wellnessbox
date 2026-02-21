import getSession from "@/lib/session";
import HealthLinkClient from "./HealthLinkClient";

type SessionUser = {
  kakaoId: number;
  loggedIn: boolean;
};

export const dynamic = "force-dynamic";

export default async function HealthLinkPage() {
  const session = await getSession();
  const user = session.user as Partial<SessionUser> | undefined;
  const loggedIn = user?.loggedIn === true && typeof user.kakaoId === "number";

  return <HealthLinkClient loggedIn={loggedIn} />;
}
