import B2bAdminReportClient from "./B2bAdminReportClient";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ demo?: string }>;
};

export default async function B2bAdminReportPage(props: PageProps) {
  const searchParams = (await props.searchParams) ?? {};
  const demoMode = searchParams.demo === "1";
  return <B2bAdminReportClient demoMode={demoMode} />;
}
