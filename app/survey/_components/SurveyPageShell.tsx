"use client";

import type { ComponentProps } from "react";
import SurveyCalculatingPanel from "./SurveyCalculatingPanel";
import SurveyIntroPanel from "./SurveyIntroPanel";
import SurveyRenewalModal from "./SurveyRenewalModal";
import SurveyResetConfirmModal from "./SurveyResetConfirmModal";
import SurveyResultPanel from "./SurveyResultPanel";
import SurveySectionPanel from "./SurveySectionPanel";
import SurveySubmittedPanel from "./SurveySubmittedPanel";

type SurveyPageShellProps = {
  hydrated: boolean;
  phase: "intro" | "survey" | "calculating" | "result";
  isAdminLoggedIn: boolean;
  introPanelProps: ComponentProps<typeof SurveyIntroPanel>;
  sectionPanelProps: ComponentProps<typeof SurveySectionPanel>;
  calculatingPanelProps: ComponentProps<typeof SurveyCalculatingPanel>;
  resultPanelProps: ComponentProps<typeof SurveyResultPanel>;
  submittedPanelProps: ComponentProps<typeof SurveySubmittedPanel>;
  renewalModalProps: ComponentProps<typeof SurveyRenewalModal>;
  resetConfirmModalProps: ComponentProps<typeof SurveyResetConfirmModal>;
};

export default function SurveyPageShell({
  hydrated,
  phase,
  isAdminLoggedIn,
  introPanelProps,
  sectionPanelProps,
  calculatingPanelProps,
  resultPanelProps,
  submittedPanelProps,
  renewalModalProps,
  resetConfirmModalProps,
}: SurveyPageShellProps) {
  if (!hydrated) return null;

  return (
    <div
      className="relative isolate w-full overflow-hidden bg-[radial-gradient(130%_90%_at_0%_0%,#c9f6ff_0%,#dce9ff_42%,#eef2ff_100%)] py-5 sm:py-8"
      style={{
        minHeight:
          "max(calc(105vh - var(--wb-topbar-height, 3.5rem)), calc(105dvh - var(--wb-topbar-height, 3.5rem)))",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-16 h-64 w-64 rounded-full bg-cyan-300/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-blue-300/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-indigo-200/45 blur-3xl"
      />
      <div className="relative z-10 mx-auto w-full max-w-full overflow-visible px-4 sm:max-w-[640px] lg:max-w-[760px]">
        {phase === "intro" ? <SurveyIntroPanel {...introPanelProps} /> : null}
        {phase === "survey" ? <SurveySectionPanel {...sectionPanelProps} /> : null}
        {phase === "calculating" ? <SurveyCalculatingPanel {...calculatingPanelProps} /> : null}
        {phase === "result" && isAdminLoggedIn ? <SurveyResultPanel {...resultPanelProps} /> : null}
        {phase === "result" && !isAdminLoggedIn ? <SurveySubmittedPanel {...submittedPanelProps} /> : null}
      </div>

      <SurveyRenewalModal {...renewalModalProps} />
      <SurveyResetConfirmModal {...resetConfirmModalProps} />
    </div>
  );
}
