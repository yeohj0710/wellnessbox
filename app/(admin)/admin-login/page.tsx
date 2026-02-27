"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./adminLogin.module.css";

function resolveSafeRedirectPath(raw: string | null) {
  if (!raw) return "/admin";
  if (!raw.startsWith("/")) return "/admin";
  if (raw.startsWith("//")) return "/admin";
  return raw;
}

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/admin");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const redirect = searchParams.get("redirect");
    setRedirectPath(resolveSafeRedirectPath(redirect));
  }, []);

  const isSubmitDisabled = useMemo(
    () => isLoading || password.trim().length === 0,
    [isLoading, password]
  );

  const handleSubmit = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (isSubmitDisabled) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, loginType: "admin" }),
      });

      if (response.ok) {
        window.location.assign(redirectPath);
        return;
      }

      setError("비밀번호가 올바르지 않습니다.");
    } catch {
      setError("로그인 요청 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageShell}>
      <div className={styles.pageInner}>
        <section className={styles.loginCard}>
          <header className={styles.hero}>
            <span className={styles.badge}>관리자 전용</span>
            <h1 className={styles.title}>관리자 로그인</h1>
            <p className={styles.description}>
              관리자 비밀번호를 입력하면 운영 페이지로 이동합니다.
            </p>
          </header>

          <form onSubmit={handleSubmit} className={styles.formBody}>
            <label className={styles.field}>
              <span className={styles.label}>관리자 비밀번호</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호 입력"
                className={styles.input}
                disabled={isLoading}
                autoFocus
              />
            </label>

            {error ? (
              <div className={styles.error} role="alert">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={styles.submitButton}
            >
              {isLoading ? (
                <span className={styles.loadingContent}>
                  <span className={styles.spinner} aria-hidden />
                  인증 중
                </span>
              ) : (
                "로그인"
              )}
            </button>

            {isLoading ? (
              <div className={styles.loadingRail} aria-hidden>
                <div className={styles.loadingBar} />
              </div>
            ) : null}

            <p className={styles.footerText}>
              인증이 완료되면 관리자 화면으로 자동 이동합니다.
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
