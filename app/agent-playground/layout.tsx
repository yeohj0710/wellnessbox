import type { Metadata } from "next";
import Link from "next/link";

import "../globals.css";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = createNoIndexMetadata(
  "Agent Playground | Workflow vs LLM",
  "Next.js agent playground: compare single-shot LLM responses with structured agent workflows across common patterns."
);

export default function AgentPlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-4">
          <div className="text-sm text-gray-500">Agent Playground 전용 페이지</div>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">LLM vs Agent Workflow</h1>
            <Link href="/" className="text-xs text-indigo-600 hover:underline">
              홈으로 이동
            </Link>
          </div>
          <p className="text-xs text-gray-600">
            패턴별 워크플로를 실행해 단일 LLM 응답과 비교합니다.
          </p>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
