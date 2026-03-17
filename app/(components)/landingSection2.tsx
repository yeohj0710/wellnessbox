"use client";

import LandingSection2Content from "./landingSection2/index";

interface LandingSection2Props {
  onSelect7Day: () => void;
  onSubscribe: () => void;
}

export default function LandingSection2(props: LandingSection2Props) {
  return <LandingSection2Content {...props} />;
}
