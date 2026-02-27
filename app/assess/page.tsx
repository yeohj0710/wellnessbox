"use client";

import { useLoading } from "@/components/common/loadingContext.client";
import IntroSection from "./components/IntroSection";
import QuestionSection from "./components/QuestionSection";
import CSectionWrapper from "./components/CSectionWrapper";
import DoneSection from "./components/DoneSection";
import ConfirmResetModal from "./components/ConfirmResetModal";
import { ASSESS_C_PERSIST_KEY } from "./lib/assessStorage";
import { useAssessFlow } from "./useAssessFlow";

export default function Assess() {
  const { showLoading } = useLoading();
  const flow = useAssessFlow();

  let content: JSX.Element | null = null;

  if (flow.section === "INTRO") {
    content = <IntroSection onStart={flow.startIntro} />;
  } else if (flow.section === "C") {
    content = (
      <CSectionWrapper
        loading={flow.loading}
        loadingText={flow.loadingText}
        onPrev={flow.handleCPrev}
        onReset={flow.confirmReset}
        cCats={flow.cCats}
        cProgress={flow.cProgress}
        cProgressMsg={flow.cProgressMsg}
        cEpoch={flow.cEpoch}
        onSubmit={flow.handleCSubmit}
        onProgress={flow.handleCProgress}
        registerPrev={flow.registerPrevCb}
        persistKey={ASSESS_C_PERSIST_KEY}
        onLoadingChange={flow.handleCLoadingChange}
      />
    );
  } else if (flow.section === "DONE" && flow.cResult) {
    content = (
      <DoneSection
        cResult={flow.cResult}
        recommendedIds={flow.recommendedIds}
        onBack={flow.goBack}
        onReset={flow.confirmReset}
        showLoading={showLoading}
      />
    );
  } else {
    content = (
      <QuestionSection
        loading={flow.loading}
        loadingText={flow.loadingText}
        onBack={flow.goBack}
        onReset={flow.confirmReset}
        sectionTitle={flow.sectionTitle}
        completion={flow.completion}
        answered={flow.answered}
        total={flow.total}
        progressMsg={flow.progressMsg}
        currentQuestion={flow.currentQuestion}
        answers={flow.answers}
        current={flow.current}
        handleAnswer={flow.handleAnswer}
      />
    );
  }

  return (
    <>
      <div id="assess-flow">{content}</div>
      <ConfirmResetModal
        open={flow.confirmOpen}
        cancelBtnRef={flow.cancelBtnRef}
        onCancel={flow.closeConfirm}
        onConfirm={flow.confirmAndReset}
      />
    </>
  );
}
