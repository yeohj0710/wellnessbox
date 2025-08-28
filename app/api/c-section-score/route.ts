import { NextResponse } from 'next/server';
import { getCatOrder, run } from '../../assess/lib/csModel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '?섎せ???붿껌?낅땲??' }, { status: 400 });
  }
  const cats = (body as any).cats;
  const answers = (body as any).answers;
  if (!Array.isArray(cats) || !Array.isArray(answers))
    return NextResponse.json({ error: '?뺤떇???щ컮瑜댁? ?딆뒿?덈떎.' }, { status: 400 });
  if (cats.length !== 3 || answers.length !== 3)
    return NextResponse.json({ error: '?낅젰 媛쒖닔媛 ?щ컮瑜댁? ?딆뒿?덈떎.' }, { status: 400 });
  const order = await getCatOrder();
  for (const c of cats)
    if (typeof c !== 'string' || !order.includes(c))
      return NextResponse.json({ error: '?????녿뒗 移댄뀒怨좊━?낅땲??' }, { status: 400 });
  for (const row of answers) {
    if (!Array.isArray(row) || row.length !== 5)
      return NextResponse.json({ error: '?묐떟 ?뺤떇???섎せ?섏뿀?듬땲??' }, { status: 400 });
    for (const v of row) {
      if (typeof v !== 'number' || v < 0 || v > 3)
        return NextResponse.json({ error: '?묐떟 媛믪씠 踰붿쐞瑜?踰쀬뼱?ъ뒿?덈떎.' }, { status: 400 });
    }
  }
  try {
    const result = await run(cats, answers as number[][]);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}


