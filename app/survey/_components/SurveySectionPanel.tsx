"use client";

import type { ReactNode } from "react";
import type { WellnessSurveyQuestionForTemplate } from "@/lib/wellness/data-template-types";

type SurveyPanelQuestionNode = {
  sectionKey: string | null;
  sectionTitle: string;
  question: WellnessSurveyQuestionForTemplate;
};

type SurveyPanelSection = {
  key: string;
  title: string;
  questions: SurveyPanelQuestionNode[];
};

export type SurveySectionPanelText = {
  commonSection: string;
  sectionGuide: string;
  restart: string;
  progressBarLabel: string;
  sectionTransitionTitle: string;
  sectionTransitionDesc: string;
  commonBadge: string;
  requiredBadge: string;
  optionalBadge: string;
  optionalHint: string;
};

export default function SurveySectionPanel(props: {
  text: SurveySectionPanelText;
  currentSectionIndex: number;
  currentSection: SurveyPanelSection | null;
  surveySections: SurveyPanelSection[];
  progressPercent: number;
  progressMessage: string;
  isSectionTransitioning: boolean;
  isCommonSurveySection: boolean;
  hasPrevStep: boolean;
  prevButtonLabel: string;
  nextButtonLabel: string;
  focusedQuestionKey: string | null;
  errorQuestionKey: string | null;
  errorText: string | null;
  onReset: () => void;
  onMoveToSection: (index: number) => void;
  onMovePreviousSection: () => void;
  onMoveNextSection: () => void;
  onQuestionRef: (questionKey: string, node: HTMLElement | null) => void;
  renderQuestionInput: (question: WellnessSurveyQuestionForTemplate) => ReactNode;
  resolveQuestionText: (question: WellnessSurveyQuestionForTemplate) => string;
  resolveQuestionHelpText: (question: WellnessSurveyQuestionForTemplate) => string;
  isQuestionRequired: (question: WellnessSurveyQuestionForTemplate) => boolean;
  shouldShowQuestionOptionalHint: (question: WellnessSurveyQuestionForTemplate) => boolean;
}) {
  const { text, currentSection, surveySections } = props;

  return (
    <div className="overflow-visible rounded-[30px] border border-sky-200/70 bg-white/90 p-4 shadow-[0_24px_58px_-36px_rgba(15,23,42,0.48)] backdrop-blur sm:p-7">
      <header className="grid gap-4 border-b border-slate-200/80 pb-5 sm:pb-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-1.5">
          <span className="inline-flex rounded-full border border-cyan-300 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
            {props.currentSectionIndex + 1}. {currentSection?.title ?? text.commonSection}
          </span>
          <p className="text-sm text-slate-600 sm:text-base">{text.sectionGuide}</p>
        </div>
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={props.onReset}
              data-testid="survey-header-reset-button"
              className="text-sm font-medium text-slate-500 underline decoration-slate-400 underline-offset-2 hover:text-cyan-700 hover:decoration-cyan-600"
            >
              {text.restart}
            </button>
          </div>
          <div className="rounded-2xl border border-cyan-200/80 bg-white/85 px-3 py-3">
            <div className="mb-1.5 flex items-center justify-between text-sm text-slate-600">
              <span>{text.progressBarLabel}</span>
              <span className="font-semibold text-cyan-700">{props.progressPercent}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-cyan-100">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-[width] duration-300"
                style={{ width: `${props.progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-cyan-700">{props.progressMessage}</p>
          </div>
        </div>
      </header>

      {surveySections.length > 1 ? (
        <nav className="mt-5 flex flex-wrap gap-2.5">
          {surveySections.map((section, index) => (
            <button
              key={section.key}
              type="button"
              disabled={props.isSectionTransitioning}
              onClick={() => props.onMoveToSection(index)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                index === props.currentSectionIndex
                  ? "bg-cyan-600 text-white shadow-sm hover:bg-cyan-700"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
              } ${props.isSectionTransitioning ? "cursor-wait opacity-70" : ""}`}
            >
              {section.title}
            </button>
          ))}
        </nav>
      ) : null}

      {props.isSectionTransitioning ? (
        <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/80 px-3 py-2.5 text-sm text-cyan-700">
          <p className="font-semibold">{text.sectionTransitionTitle}</p>
          <p className="mt-0.5 text-xs text-cyan-700/80">{text.sectionTransitionDesc}</p>
        </div>
      ) : null}

      <section className="mt-6 space-y-3.5 overflow-visible max-h-none">
        {currentSection?.questions.map((node, sectionQuestionIndex) => {
          const question = node.question;
          const questionText = props.resolveQuestionText(question);
          const isFocused = props.focusedQuestionKey === question.key;
          const questionNumber = sectionQuestionIndex + 1;
          const shouldShowOptionalHint = props.shouldShowQuestionOptionalHint(question);
          const isEffectivelyRequired = props.isQuestionRequired(question);
          const resolvedHelpText = props.resolveQuestionHelpText(question);

          return (
            <article
              key={question.key}
              data-testid="survey-question"
              data-question-key={question.key}
              data-question-type={question.type}
              data-focused={isFocused ? "true" : "false"}
              ref={(nodeRef) => {
                props.onQuestionRef(question.key, nodeRef);
              }}
              className={`rounded-3xl border bg-gradient-to-b from-white to-slate-50/60 p-4 transition sm:p-6 ${
                isFocused
                  ? "border-cyan-300 shadow-[0_16px_36px_-24px_rgba(34,211,238,0.85)]"
                  : "border-slate-200/90"
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                  {node.sectionKey ? node.sectionTitle : text.commonBadge}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    isEffectivelyRequired
                      ? "bg-rose-100 text-rose-700"
                      : "border border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {isEffectivelyRequired ? text.requiredBadge : text.optionalBadge}
                </span>
              </div>

              <div className="w-full text-left">
                <h3 className="text-xl font-extrabold leading-tight text-slate-900 sm:text-2xl sm:leading-tight">
                  {questionNumber}. {questionText || question.key}
                </h3>
              </div>

              {resolvedHelpText ? <p className="mt-2 text-sm text-slate-500">{resolvedHelpText}</p> : null}
              {shouldShowOptionalHint ? (
                <p className="mt-2 text-xs text-slate-500">{text.optionalHint}</p>
              ) : null}

              <div className="mt-4">{props.renderQuestionInput(question)}</div>
              {props.errorQuestionKey === question.key && props.errorText ? (
                <p className="mt-2 text-sm font-medium text-rose-600">{props.errorText}</p>
              ) : null}
            </article>
          );
        })}
      </section>

      <footer
        className={`mt-7 flex items-center ${
          props.isCommonSurveySection ? "justify-end" : "justify-between"
        }`}
      >
        {!props.isCommonSurveySection ? (
          <button
            type="button"
            onClick={props.onMovePreviousSection}
            disabled={!props.hasPrevStep || props.isSectionTransitioning}
            data-testid="survey-prev-button"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {props.prevButtonLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={props.onMoveNextSection}
          disabled={props.isSectionTransitioning}
          data-testid="survey-next-button"
          className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {props.nextButtonLabel}
        </button>
      </footer>
    </div>
  );
}
