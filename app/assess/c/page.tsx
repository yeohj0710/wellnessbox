import CSection from '@/assess/c-section';

export default function Page({ searchParams }: { searchParams?: { cats?: string } }) {
  const catsParam = searchParams?.cats;
  const cats = catsParam ? catsParam.split(',') : null;
  if (!cats || cats.length !== 3)
    return <div className="p-4 text-red-600">카테고리 정보를 불러오지 못했습니다.</div>;
  return <CSection cats={cats} />;
}
