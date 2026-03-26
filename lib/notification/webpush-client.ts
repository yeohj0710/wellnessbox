import * as webpush from "web-push";

webpush.setVapidDetails(
  "mailto:contact@wellnessbox.kr",
  (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim(),
  (process.env.VAPID_PRIVATE_KEY || "").trim()
);

export { webpush };
