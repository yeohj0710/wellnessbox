"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
import { ProfileModalForm } from "@/app/chat/components/ProfileModalForm";
import { saveProfileLocal, saveProfileServer } from "@/app/chat/utils";
import type { UserProfile } from "@/types/chat";
import type {
  MyDataDataQualityIssue,
  MyDataDataQualityModel,
} from "./myDataDataQuality";

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function mergeProfileUpdate(
  profile: UserProfile,
  issue: MyDataDataQualityIssue
): UserProfile {
  if (issue.primaryAction.kind === "save_goal") {
    return {
      ...profile,
      goals: uniq([...(profile.goals || []), issue.primaryAction.value]),
    };
  }

  if (issue.primaryAction.kind === "save_medications") {
    return {
      ...profile,
      medications: uniq([
        ...(profile.medications || []),
        ...issue.primaryAction.values,
      ]),
    };
  }

  return profile;
}

function resolveToneClasses(tone: "amber" | "sky") {
  if (tone === "amber") {
    return {
      shell: "border-amber-200 bg-amber-50/70",
      badge: "bg-amber-100 text-amber-700",
      primary: "bg-amber-500 text-white hover:bg-amber-600",
    };
  }

  return {
    shell: "border-sky-200 bg-sky-50/70",
    badge: "bg-sky-100 text-sky-700",
    primary: "bg-sky-600 text-white hover:bg-sky-700",
  };
}

export default function MyDataDataQualitySection({
  model,
}: {
  model: MyDataDataQualityModel;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<UserProfile>({
    ...(model.profile || {}),
  });
  const [lastAppliedIssueId, setLastAppliedIssueId] = useState<string | null>(null);

  const setField = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfileDraft((prev) => ({ ...(prev || {}), [key]: value }));
  };

  const visibleIssues = useMemo(
    () =>
      model.issues.filter((issue) => issue.id !== lastAppliedIssueId).slice(0, 3),
    [lastAppliedIssueId, model.issues]
  );

  if (visibleIssues.length === 0 && !profileEditorOpen) return null;

  const persistProfile = (nextProfile: UserProfile, issueId?: string) => {
    startTransition(() => {
      saveProfileLocal(nextProfile);
      void saveProfileServer(nextProfile).finally(() => {
        setProfileDraft(nextProfile);
        if (issueId) setLastAppliedIssueId(issueId);
        router.refresh();
      });
    });
  };

  return (
    <section className="mt-6 rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.3)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
              데이터 정리
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              조용히 맞추면 전체 경험이 좋아져요
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
            빠진 정보나 오래된 맥락을 먼저 정리해둘 수 있어요
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            지금 기록을 기준으로 추천 전에 먼저 정리하면 좋은 항목만 골랐습니다. 한 번만 확인해도 상담, 탐색, 재구매 흐름이 함께 선명해집니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setProfileEditorOpen((prev) => !prev)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          {profileEditorOpen ? "프로필 접기" : "프로필 직접 확인"}
        </button>
      </div>

      {visibleIssues.length > 0 ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {visibleIssues.map((issue) => {
            const tone = resolveToneClasses(issue.tone);

            return (
              <div
                key={issue.id}
                className={`rounded-2xl border p-4 ${tone.shell}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone.badge}`}>
                    확인 추천
                  </span>
                </div>
                <div className="mt-3 text-base font-extrabold text-slate-900">
                  {issue.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {issue.description}
                </p>
                {issue.evidence.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {issue.evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (issue.primaryAction.kind === "open_profile") {
                        setProfileEditorOpen(true);
                        return;
                      }

                      if (issue.primaryAction.kind === "link") {
                        router.push(issue.primaryAction.href);
                        return;
                      }

                      const nextProfile = mergeProfileUpdate(profileDraft, issue);
                      persistProfile(nextProfile, issue.id);
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${tone.primary}`}
                  >
                    {issue.primaryAction.label}
                  </button>

                  {issue.secondaryAction ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (issue.secondaryAction?.kind === "open_profile") {
                          setProfileEditorOpen(true);
                          return;
                        }
                        if (issue.secondaryAction?.kind === "link") {
                          router.push(issue.secondaryAction.href);
                        }
                      }}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {issue.secondaryAction.label}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {profileEditorOpen ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                프로필 빠르게 확인
              </div>
              <p className="mt-1 text-sm text-slate-600">
                비어 있거나 헷갈리는 값만 빠르게 정리해도 이후 추천과 상담 맥락이 좋아집니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProfileEditorOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                접기
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => persistProfile(profileDraft)}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? <InlineSpinnerLabel label="저장 중" /> : "프로필 저장"}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <ProfileModalForm local={profileDraft} setField={setField} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
