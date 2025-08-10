import localFont from "next/font/local";
import { Inter } from "next/font/google";

export const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  weight: "100 900",
  display: "swap",
});

export const nexon = localFont({
  src: [
    {
      path: "./fonts/NEXONLv2GothicLight.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/NEXONLv2GothicRegular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/NEXONLv2GothicMedium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/NEXONLv2GothicBold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
