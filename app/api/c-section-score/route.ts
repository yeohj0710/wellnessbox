import { NextResponse } from 'next/server';
import { getCatOrder, run } from '../../assess/lib/csModel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: '요청 본문을 JSON으로 읽지 못했어요.' },
      { status: 400 }
    );
  }
  const cats = (body as any).cats;
  const answers = (body as any).answers;
  if (!Array.isArray(cats) || !Array.isArray(answers))
    return NextResponse.json(
      { error: '입력 형식이 올바르지 않아요.' },
      { status: 400 }
    );
  if (cats.length !== 3 || answers.length !== 3)
    return NextResponse.json(
      { error: '입력 개수가 올바르지 않아요.' },
      { status: 400 }
    );
  const order = await getCatOrder();
  for (const c of cats)
    if (typeof c !== 'string' || !order.includes(c))
      return NextResponse.json(
        { error: '알 수 없는 카테고리에요.' },
        { status: 400 }
      );
  for (const row of answers) {
    if (!Array.isArray(row) || row.length !== 5)
      return NextResponse.json(
        { error: '답변 형식이 잘못되었어요.' },
        { status: 400 }
      );
    for (const v of row) {
      if (typeof v !== 'number' || v < 0 || v > 3)
        return NextResponse.json(
          { error: '답변 값이 범위를 벗어났어요.' },
          { status: 400 }
        );
    }
  }
  try {
    const result = await run(cats, answers as number[][]);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

