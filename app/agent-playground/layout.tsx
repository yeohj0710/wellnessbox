import type { Metadata } from "next";
import Link from "next/link";
import "../globals.css";

export const metadata: Metadata = {
  title: "Agent Playground | Workflow vs LLM",
  description:
    "Next.js agent playground: compare single-shot LLM responses with structured agent workflows across common patterns.",
  openGraph: {
    title: "Agent Playground | Workflow vs LLM",
    description:
      "Compare LLM one-shot outputs with multi-step agent patterns (chaining, optimizer loop, routing, voting).",
  },
};

export default function AgentPlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-1">
          <div className="text-sm text-gray-500">Agent Playground 전용 페이지</div>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">LLM vs Agent Workflow</h1>
            <Link href="/" className="text-xs text-indigo-600 hover:underline">
              홈으로 이동
            </Link>
          </div>
          <p className="text-xs text-gray-600">
            패턴별 그래프/워크플로를 실행해 단일 LLM 호출과 비교합니다.
          </p>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
