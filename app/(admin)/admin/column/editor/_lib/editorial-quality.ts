export type EditorialQualityReport = {
  plainTextLength: number;
  levelTwoHeadingCount: number;
  externalSourceCount: number;
  internalLinkCount: number;
  criticalIssues: string[];
  warnings: string[];
  strengths: string[];
};

type EditorialQualityInput = {
  title: string;
  excerpt: string;
  contentMarkdown: string;
};

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1 ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countMatches(input: string, pattern: RegExp) {
  return input.match(pattern)?.length ?? 0;
}

function countUniqueMarkdownLinks(markdown: string, prefix: "http" | "/") {
  const matches = [...markdown.matchAll(/\[[^\]]+]\(([^)]+)\)/g)]
    .map((match) => match[1]?.trim() || "")
    .filter((href) =>
      prefix === "http" ? /^https?:\/\//.test(href) : href.startsWith("/")
    );

  return new Set(matches).size;
}

export function analyzeEditorialQuality(
  input: EditorialQualityInput
): EditorialQualityReport {
  const plainText = stripMarkdown(input.contentMarkdown);
  const firstParagraphSample = plainText.slice(0, 280);
  const levelTwoHeadingCount = countMatches(input.contentMarkdown, /^##\s+/gm);
  const externalSourceCount = countUniqueMarkdownLinks(input.contentMarkdown, "http");
  const internalLinkCount = countUniqueMarkdownLinks(input.contentMarkdown, "/");

  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  const strengths: string[] = [];

  if (plainText.length < 1400) {
    criticalIssues.push("본문 분량이 너무 짧아요. 실제 사례와 맥락 설명을 더 보강해 주세요.");
  }

  if (levelTwoHeadingCount < 3) {
    criticalIssues.push("소제목 구성이 너무 얕아요. 최소 3개 이상의 큰 문단으로 논리를 나눠 주세요.");
  }

  if (externalSourceCount < 2) {
    criticalIssues.push("공개 근거 링크가 부족해요. 최소 2개 이상의 외부 참고 자료를 넣어 주세요.");
  }

  if (/^웰니스박스 가이드[:：]/.test(input.title.trim())) {
    criticalIssues.push("제목이 브랜드 접두어 중심이라 투박해 보여요. 독자가 바로 이해하는 주제로 바꿔 주세요.");
  }

  if (/안녕하세요,\s*웰니스박스예요/.test(`${input.excerpt}\n${firstParagraphSample}`)) {
    criticalIssues.push("도입부 인삿말이 브랜드 문구처럼 보여요. 문제 상황이나 독자 질문으로 바로 시작해 주세요.");
  }

  if (
    input.contentMarkdown.includes("## 핵심만 먼저") &&
    input.contentMarkdown.includes("## 같이 읽으면 좋은 글") &&
    input.contentMarkdown.includes("## 참고 자료")
  ) {
    warnings.push("템플릿형 소제목 구조가 반복돼 보여요. 글마다 소제목 순서와 리듬을 달리해 주세요.");
  }

  if (/쉽게 정리했어요|초보자 기준|웰니스박스 상담/.test(input.excerpt + input.contentMarkdown)) {
    warnings.push("설명 방식이 다소 홍보 문구처럼 읽혀요. 관찰, 조건, 예외를 더 구체적으로 써 주세요.");
  }

  if (internalLinkCount < 2) {
    warnings.push("관련 칼럼 연결이 적어요. 문맥상 자연스러운 내부 링크를 2개 이상 넣어 주세요.");
  }

  if (plainText.length >= 2200) {
    strengths.push("본문 분량이 충분해요.");
  }

  if (externalSourceCount >= 3) {
    strengths.push("외부 근거 링크가 충분해요.");
  }

  if (internalLinkCount >= 2) {
    strengths.push("관련 칼럼 연결이 잘 되어 있어요.");
  }

  return {
    plainTextLength: plainText.length,
    levelTwoHeadingCount,
    externalSourceCount,
    internalLinkCount,
    criticalIssues,
    warnings,
    strengths,
  };
}

export function getEditorialPublishBlockReason(report: EditorialQualityReport) {
  return report.criticalIssues[0] ?? null;
}
