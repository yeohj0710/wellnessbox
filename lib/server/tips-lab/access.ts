export type TipsLabSessionShape = {
  user?: { loggedIn?: boolean; kakaoId?: unknown };
  admin?: { loggedIn?: boolean };
  test?: { loggedIn?: boolean };
  pharm?: { loggedIn?: boolean };
  rider?: { loggedIn?: boolean };
};

export function canAccessTipsLab(session: TipsLabSessionShape) {
  const user = session.user?.loggedIn === true && typeof session.user.kakaoId === "number";
  return user || session.admin?.loggedIn === true || session.test?.loggedIn === true;
}

