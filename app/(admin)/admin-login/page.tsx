"use client";

import { useEffect, useState } from "react";
import styles from "@/components/b2b/B2bUx.module.css";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/admin");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const redirect = searchParams.get("redirect");
    if (redirect) setRedirectPath(redirect);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, loginType: "admin" }),
      });
      if (res.ok) {
        window.location.href = redirectPath;
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
    <div className={`${styles.page} ${styles.compactPage} ${styles.stack}`}>
      <header className={styles.heroCard}>
        <p className={styles.kicker}>ADMIN ACCESS</p>
        <h1 className={styles.title}>관리자 로그인</h1>
        <p className={styles.description}>
          관리자 비밀번호를 입력하면 운영 대시보드로 이동합니다.
        </p>
      </header>

      <section className={styles.sectionCard}>
        <form onSubmit={handleSubmit} className={styles.stack}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>관리자 비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호 입력"
              className={styles.input}
            />
          </label>

          {error ? <div className={styles.noticeError}>{error}</div> : null}

          <div className={styles.actionRow}>
            <button
              type="submit"
              disabled={isLoading || password.trim().length === 0}
              className={styles.buttonPrimary}
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
