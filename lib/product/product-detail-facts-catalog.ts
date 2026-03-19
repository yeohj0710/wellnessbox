import {
  findCuratedProductDetailFacts,
  type ProductDetailFacts,
} from "./product-detail-facts";

type ProductDetailFactsCatalogEntry = {
  id: number;
  name: string;
  facts: ProductDetailFacts;
};

export const PRODUCT_DETAIL_FACTS_CATALOG: ProductDetailFactsCatalogEntry[] = [
  {
    id: 29,
    name: "종근당 칼슘 앤 마그네슘 비타민D 아연",
    facts: {
      highlights: [
        { label: "브랜드", value: "종근당건강" },
        { label: "유형", value: "건강기능식품" },
        { label: "형태", value: "정제" },
        { label: "일반 상품 기준", value: "1000mg x 180정" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [
            { label: "주요 원료", value: "칼슘, 마그네슘, 비타민D, 아연" },
            { label: "기능성분 표기", value: "칼슘 300mg" },
          ],
        },
        {
          title: "섭취 정보",
          rows: [
            { label: "섭취방법", value: "1일 1회, 2정" },
            { label: "180정 기준", value: "약 90일분" },
          ],
        },
      ],
      sourceUrls: [
        "https://search.danawa.com/dsearch.php?query=%EC%A2%85%EA%B7%BC%EB%8B%B9%EA%B1%B4%EA%B0%95%20%EC%B9%BC%EC%8A%98%20%EC%95%A4%20%EB%A7%88%EA%B7%B8%EB%84%A4%EC%8A%98%20%EB%B9%84%ED%83%80%EB%AF%BCD%20%EC%95%84%EC%97%B0",
      ],
    },
  },
  {
    id: 30,
    name: "고려은단 비타민C 1000",
    facts: {
      highlights: [
        { label: "브랜드", value: "고려은단" },
        { label: "유형", value: "건강기능식품" },
        { label: "형태", value: "정제" },
        { label: "표기 성분", value: "비타민C 1000mg" },
      ],
      groups: [
        {
          title: "기본 정보",
          rows: [
            { label: "일반 상품 기준", value: "180정, 1통" },
            { label: "원료 표기", value: "영국산 비타민C 원료" },
          ],
        },
      ],
      sourceUrls: [
        "https://www.11st.co.kr/products/1970892953",
        "https://www.unpa.me/products/782954",
      ],
    },
  },
  {
    id: 31,
    name: "프로메가 오메가3 트리플 장용성",
    facts: {
      highlights: [
        { label: "브랜드", value: "종근당건강" },
        { label: "유형", value: "건강기능식품" },
        { label: "형태", value: "캡슐" },
        { label: "일반 상품 기준", value: "60정, 39.24g" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [
            { label: "기능성분 표기", value: "EPA 및 DHA 함유 유지 900mg" },
            { label: "부원료 표기", value: "비타민E 11mg a-TE" },
          ],
        },
        {
          title: "섭취 정보",
          rows: [
            { label: "섭취방법", value: "1일 1회, 2캡슐" },
            { label: "제품 특징", value: "장용성 캡슐" },
          ],
        },
      ],
      sourceUrls: [
        "https://search.danawa.com/dsearch.php?query=%ED%94%84%EB%A1%9C%EB%A9%94%EA%B0%80%20%EC%98%A4%EB%A9%94%EA%B0%803%20%ED%8A%B8%EB%A6%AC%ED%94%8C%20%EC%9E%A5%EC%9A%A9%EC%84%B1",
        "https://www.yak-al.com/product/79135",
      ],
    },
  },
  {
    id: 32,
    name: "아이클리어 루테인지아잔틴",
    facts: {
      highlights: [
        { label: "브랜드", value: "종근당건강" },
        { label: "유형", value: "건강기능식품" },
        { label: "형태", value: "캡슐" },
        { label: "일반 상품 기준", value: "90정, 1통" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [
            { label: "주요 원료", value: "루테인, 지아잔틴" },
            { label: "표기 함량", value: "루테인 18.2mg, 지아잔틴 1.8mg" },
          ],
        },
      ],
      sourceUrls: [
        "https://search.danawa.com/dsearch.php?query=%EC%95%84%EC%9D%B4%ED%81%B4%EB%A6%AC%EC%96%B4%20%EB%A3%A8%ED%85%8C%EC%9D%B8%EC%A7%80%EC%95%84%EC%9E%94%ED%8B%B4",
      ],
    },
  },
  {
    id: 33,
    name: "종근당건강 비타민D 2000IU",
    facts: {
      highlights: [
        { label: "브랜드", value: "종근당건강" },
        { label: "유형", value: "건강기능식품" },
        { label: "형태", value: "캡슐" },
        { label: "표기 성분", value: "비타민D 2000IU" },
      ],
      groups: [
        {
          title: "기본 정보",
          rows: [
            { label: "일반 상품 기준", value: "500mg x 90캡슐" },
            { label: "환산 함량", value: "비타민D 50ug" },
          ],
        },
        {
          title: "섭취 정보",
          rows: [{ label: "섭취방법", value: "1일 1회, 1캡슐" }],
        },
      ],
      sourceUrls: [
        "https://www.11st.co.kr/products/2979968330",
        "https://search.danawa.com/dsearch.php?query=%EC%A2%85%EA%B7%BC%EB%8B%B9%EA%B1%B4%EA%B0%95%20%EB%B9%84%ED%83%80%EB%AF%BCD%202000IU",
      ],
    },
  },
  {
    id: 34,
    name: "나우푸드 실리마린 밀크시슬 추출물",
    facts: {
      highlights: [
        { label: "브랜드", value: "NOW Foods" },
        { label: "유형", value: "Dietary Supplement" },
        { label: "형태", value: "Vegetarian Capsules" },
        { label: "일반 상품 기준", value: "200정, 1통" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [
            { label: "밀크시슬 추출물", value: "300mg" },
            { label: "실리마린", value: "240mg" },
            { label: "부원료 표기", value: "아티초크, 민들레" },
          ],
        },
        {
          title: "제조 정보",
          rows: [{ label: "제조 국가", value: "미국" }],
        },
      ],
      sourceUrls: [
        "https://www.nowfoods.com/products/supplements/silymarin-milk-thistle-extract-double-strength-veg-capsules",
      ],
    },
  },
  {
    id: 35,
    name: "크리스찬한센 덴마크 유산균 이야기",
    facts: {
      highlights: [
        { label: "제품 라인", value: "덴마크 유산균 이야기" },
        { label: "유형", value: "프로바이오틱스" },
        { label: "형태", value: "캡슐" },
        { label: "일반 상품 기준", value: "60정, 1통" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [
            { label: "원료사 표기", value: "크리스찬한센" },
            { label: "대표 균주 표기", value: "BB-12" },
            { label: "보장균수 표기", value: "100억 CFU" },
          ],
        },
        {
          title: "섭취 정보",
          rows: [{ label: "섭취방법", value: "1일 1회, 1캡슐" }],
        },
      ],
      sourceUrls: [
        "https://search.danawa.com/dsearch.php?query=%EB%8D%B4%EB%A7%88%ED%81%AC%20%EC%9C%A0%EC%82%B0%EA%B7%A0%20%EC%9D%B4%EC%95%BC%EA%B8%B0",
        "https://bktimes.net/data/board_notice/1595995456-24.pdf",
      ],
    },
  },
  {
    id: 36,
    name: "종근당 활력 비타민B 플러스",
    facts: {
      highlights: [
        { label: "브랜드", value: "종근당" },
        { label: "유형", value: "건강기능식품" },
        { label: "형태", value: "정제" },
        { label: "일반 상품 기준", value: "800mg x 60정" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [
            { label: "주요 원료", value: "비타민B군, 엽산" },
            { label: "제품명 표기", value: "비타민B 플러스" },
          ],
        },
        {
          title: "제조 정보",
          rows: [{ label: "원산지 표기", value: "국산" }],
        },
      ],
      sourceUrls: [
        "https://onnurishop.co.kr/shop/goods/1489480",
        "https://search.danawa.com/dsearch.php?query=%ED%99%9C%EB%A0%A5%20%EB%B9%84%ED%83%80%EB%AF%BCB%20%ED%94%8C%EB%9F%AC%EC%8A%A4%2060%EC%A0%95",
      ],
    },
  },
  {
    id: 37,
    name: "그린몬스터 다이어트 스페셜 2 가르시니아 900",
    facts: {
      highlights: [
        { label: "브랜드", value: "그린몬스터" },
        { label: "유형", value: "건강기능식품" },
        { label: "형태", value: "정제" },
        { label: "일반 상품 기준", value: "900mg x 112정" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [
            { label: "주요 원료", value: "가르시니아 캄보지아 추출물" },
            { label: "표시 함량", value: "(-)-HCA 900mg" },
          ],
        },
        {
          title: "섭취 정보",
          rows: [
            { label: "섭취방법", value: "1일 2회, 식전 1정씩" },
            { label: "제조 국가", value: "대한민국" },
          ],
        },
      ],
      sourceUrls: [
        "https://www.isafe.go.kr/DATA/bbs/85/20230808024444967.pdf",
        "https://search.danawa.com/dsearch.php?query=%EA%B7%B8%EB%A6%B0%EB%AA%AC%EC%8A%A4%ED%84%B0%20%EB%8B%A4%EC%9D%B4%EC%96%B4%ED%8A%B8%20%EC%8A%A4%ED%8E%98%EC%85%9C%202%20%EA%B0%80%EB%A5%B4%EC%8B%9C%EB%8B%88%EC%95%84%20900",
      ],
    },
  },
  {
    id: 38,
    name: "종근당건강 원데이21 멀티비타민 & 미네랄",
    facts: {
      highlights: [
        { label: "브랜드", value: "종근당건강" },
        { label: "유형", value: "건강기능식품" },
        { label: "형태", value: "정제" },
        { label: "일반 상품 기준", value: "60정, 1통" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [
            { label: "비타민", value: "13종" },
            { label: "미네랄", value: "8종" },
            { label: "총 구성", value: "21종 비타민·미네랄" },
          ],
        },
        {
          title: "섭취 정보",
          rows: [{ label: "섭취방법", value: "하루 1정" }],
        },
      ],
      sourceUrls: [
        "https://search.danawa.com/dsearch.php?query=%EC%9B%90%EB%8D%B0%EC%9D%B421%20%EB%A9%80%ED%8B%B0%EB%B9%84%ED%83%80%EB%AF%BC%20%EB%AF%B8%EB%84%A4%EB%9E%84",
      ],
    },
  },
  {
    id: 39,
    name: "종근당 관절연골엔 뮤코다당단백 콘드로이친 1200 플러스",
    facts: {
      highlights: [
        { label: "브랜드", value: "종근당" },
        { label: "유형", value: "건강기능식품" },
        { label: "형태", value: "정제" },
        { label: "일반 상품 기준", value: "900mg x 60정" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [
            { label: "주요 원료", value: "뮤코다당단백, 콘드로이친 1200" },
            { label: "제품명 표기", value: "관절연골엔 콘드로이친 1200 플러스" },
          ],
        },
      ],
      sourceUrls: [
        "https://search.danawa.com/dsearch.php?query=%EA%B4%80%EC%A0%88%EC%97%B0%EA%B3%A8%EC%97%94%20%EB%AE%A4%EC%BD%94%EB%8B%A4%EB%8B%B9%EB%8B%A8%EB%B0%B1%20%EC%BD%98%EB%93%9C%EB%A1%9C%EC%9D%B4%EC%B9%9C%201200%20%ED%94%8C%EB%9F%AC%EC%8A%A4",
      ],
    },
  },
  {
    id: 40,
    name: "나우푸드 더블 스트렝스 L-아르기닌",
    facts: {
      highlights: [
        { label: "브랜드", value: "NOW Foods" },
        { label: "유형", value: "Dietary Supplement" },
        { label: "형태", value: "Tablets" },
        { label: "일반 상품 기준", value: "120정, 1통" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [{ label: "L-아르기닌", value: "1000mg" }],
        },
        {
          title: "섭취 정보",
          rows: [
            {
              label: "섭취방법",
              value: "1일 1회, 필요 시 1정씩 2회까지 공복 섭취",
            },
            { label: "제조 국가", value: "미국" },
          ],
        },
      ],
      sourceUrls: [
        "https://www.nowfoods.com/products/supplements/l-arginine-double-strength-1000-mg-tablets",
      ],
    },
  },
  {
    id: 41,
    name: "솔가 엽산 400",
    facts: {
      highlights: [
        { label: "브랜드", value: "Solgar" },
        { label: "유형", value: "건강기능식품" },
        { label: "형태", value: "정제" },
        { label: "일반 상품 기준", value: "100정, 1통" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [{ label: "엽산", value: "400ug" }],
        },
        {
          title: "섭취 정보",
          rows: [{ label: "섭취방법", value: "1일 1회, 1정" }],
        },
      ],
      sourceUrls: [
        "https://search.danawa.com/dsearch.php?query=%EC%86%94%EA%B0%80%20%EC%97%BD%EC%82%B0%20400",
        "https://www.hwahae.co.kr/product/909810",
      ],
    },
  },
  {
    id: 42,
    name: "나우푸드 아연",
    facts: {
      highlights: [
        { label: "브랜드", value: "NOW Foods" },
        { label: "유형", value: "Dietary Supplement" },
        { label: "형태", value: "Tablets" },
        { label: "일반 상품 기준", value: "250정, 1통" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [{ label: "아연", value: "50mg" }],
        },
        {
          title: "섭취 정보",
          rows: [
            { label: "섭취방법", value: "1일 1정, 식사와 함께" },
            { label: "제조 국가", value: "미국" },
          ],
        },
      ],
      sourceUrls: [
        "https://www.nowfoods.com/products/supplements/zinc-50-mg-tablets",
      ],
    },
  },
  {
    id: 43,
    name: "센트룸 맨 멀티비타민 미네랄",
    facts: {
      highlights: [
        { label: "브랜드", value: "Centrum" },
        { label: "유형", value: "멀티비타민·미네랄" },
        { label: "대상", value: "성인 남성" },
        { label: "일반 상품 기준", value: "50정, 1통" },
      ],
      groups: [
        {
          title: "기본 정보",
          rows: [
            { label: "제품 라인", value: "남성용 멀티비타민·미네랄" },
            { label: "섭취방법", value: "1일 1회, 1정" },
          ],
        },
      ],
      sourceUrls: [
        "https://search.danawa.com/dsearch.php?query=%EC%84%BC%ED%8A%B8%EB%A3%B8%20%EB%A7%A8%20%EB%A9%80%ED%8B%B0%EB%B9%84%ED%83%80%EB%AF%BC%20%EB%AF%B8%EB%84%A4%EB%9E%84",
        "https://www.centrum.com/",
      ],
    },
  },
  {
    id: 44,
    name: "GNM자연의품격 코큐텐11 코엔자임Q10 11",
    facts: {
      highlights: [
        { label: "브랜드", value: "GNM자연의품격" },
        { label: "유형", value: "건강기능식품" },
        { label: "형태", value: "캡슐" },
        { label: "일반 상품 기준", value: "120정, 1통" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [
            { label: "코엔자임Q10", value: "100mg" },
            { label: "아연", value: "4.25mg" },
            { label: "셀레늄", value: "27.5ug" },
          ],
        },
        {
          title: "제조 정보",
          rows: [
            { label: "판매원", value: "GNM라이프" },
            { label: "제조원", value: "대원헬스케어" },
          ],
        },
        {
          title: "섭취 정보",
          rows: [{ label: "섭취방법", value: "1일 1회, 1캡슐" }],
        },
      ],
      sourceUrls: [
        "https://search.danawa.com/dsearch.php?query=GNM%EC%9E%90%EC%97%B0%EC%9D%98%ED%92%88%EA%B2%A9%20%EC%BD%94%ED%81%90%ED%85%9011%20%EC%BD%94%EC%97%94%EC%9E%90%EC%9E%84Q10%2011",
      ],
    },
  },
  {
    id: 45,
    name: "센트룸 우먼 멀티비타민 미네랄",
    facts: {
      highlights: [
        { label: "브랜드", value: "Centrum" },
        { label: "유형", value: "멀티비타민·미네랄" },
        { label: "대상", value: "성인 여성" },
        { label: "일반 상품 기준", value: "50정, 1통" },
      ],
      groups: [
        {
          title: "기본 정보",
          rows: [
            { label: "제품 라인", value: "여성용 멀티비타민·미네랄" },
            { label: "섭취방법", value: "1일 1회, 1정" },
          ],
        },
      ],
      sourceUrls: [
        "https://search.danawa.com/dsearch.php?query=%EC%84%BC%ED%8A%B8%EB%A3%B8%20%EC%9A%B0%EB%A8%BC%20%EB%A9%80%ED%8B%B0%EB%B9%84%ED%83%80%EB%AF%BC%20%EB%AF%B8%EB%84%A4%EB%9E%84",
        "https://www.centrum.com/",
      ],
    },
  },
  {
    id: 46,
    name: "보령 브레인 두뇌의 인지력엔 포스파티딜세린 PS",
    facts: {
      highlights: [
        { label: "브랜드", value: "보령" },
        { label: "유형", value: "건강기능식품" },
        { label: "형태", value: "캡슐" },
        { label: "일반 상품 기준", value: "30g / 60캡슐" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [{ label: "포스파티딜세린", value: "300mg" }],
        },
        {
          title: "섭취 정보",
          rows: [
            { label: "섭취방법", value: "1일 1회, 2캡슐" },
            { label: "제품명 표기", value: "기억력 개선용 PS 제품" },
          ],
        },
      ],
      sourceUrls: [
        "https://www.purelifespankorea.co.kr/product/%EB%B3%B4%EB%A0%B9-%EB%B8%8C%EB%A0%88%EC%9D%B8-%EB%91%90%EB%87%8C%EC%9D%98-%EC%9D%B8%EC%A7%80%EB%A0%A5%EC%97%94-%ED%8F%AC%EC%8A%A4%ED%8C%8C%ED%8B%B0%EB%94%9C%EC%84%B8%EB%A6%B0-ps-300-30g-1",
      ],
    },
  },
  {
    id: 47,
    name: "에버콜라겐 인앤업 플러스",
    facts: {
      highlights: [
        { label: "브랜드", value: "에버콜라겐" },
        { label: "유형", value: "건강기능식품" },
        { label: "형태", value: "정제" },
        { label: "일반 상품 기준", value: "84정, 1통" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [
            { label: "기능성 원료", value: "저분자콜라겐펩타이드" },
            { label: "부원료 표기", value: "비타민C, 비타민D, 비오틴, 셀렌" },
            { label: "기타 원료 표기", value: "히알루론산, 엘라스틴가수분해물" },
          ],
        },
        {
          title: "보관 정보",
          rows: [{ label: "보관방법", value: "직사광선을 피해 실온 보관" }],
        },
      ],
      sourceUrls: [
        "https://newtreemall.co.kr/evercollagen",
        "https://file.alphasquare.co.kr/media/pdfs/company-report/%EB%8C%80%EC%8B%A020190918%EB%89%B4%ED%8A%B8%EB%A6%AC.pdf",
      ],
    },
  },
  {
    id: 48,
    name: "비타할로 철분",
    facts: {
      highlights: [
        { label: "브랜드", value: "비타할로" },
        { label: "유형", value: "건강기능식품" },
        { label: "형태", value: "캡슐형" },
        { label: "일반 상품 기준", value: "250mg x 90캡슐" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [
            { label: "주원료", value: "푸마르산제일철" },
            {
              label: "기능 정보",
              value: "체내 산소운반과 혈액생성, 에너지 생성에 필요",
            },
          ],
        },
        {
          title: "제조 정보",
          rows: [
            { label: "제조원", value: "(주)한미양행" },
            { label: "판매원", value: "쿠팡(주)" },
          ],
        },
        {
          title: "섭취 정보",
          rows: [{ label: "섭취방법", value: "1일 1회, 1캡슐" }],
        },
      ],
      sourceUrls: [
        "https://hanminutrition.com/c01454/",
      ],
    },
  },
  {
    id: 49,
    name: "나우푸드 실리엄 허스크 500mg 베지 캡슐",
    facts: {
      highlights: [
        { label: "브랜드", value: "NOW Foods" },
        { label: "유형", value: "Dietary Supplement" },
        { label: "형태", value: "Veg Capsules" },
        { label: "일반 상품 기준", value: "500정, 1통" },
      ],
      groups: [
        {
          title: "표기 성분",
          rows: [
            { label: "차전자피", value: "3캡슐당 1.5g" },
            { label: "가용성 식이섬유", value: "1.1g" },
            { label: "불용성 식이섬유", value: "0.4g" },
          ],
        },
        {
          title: "섭취 정보",
          rows: [
            {
              label: "섭취방법",
              value: "1회 3캡슐씩 하루 2~3회, 충분한 물과 함께 섭취",
            },
            { label: "제조 국가", value: "미국" },
          ],
        },
      ],
      sourceUrls: [
        "https://www.nowfoods.com/products/supplements/psyllium-husk-500-mg-veg-capsules",
      ],
    },
  },
];

export function getCuratedProductDetailFacts(product: {
  id?: number | null;
  name?: string | null;
}) {
  return findCuratedProductDetailFacts(PRODUCT_DETAIL_FACTS_CATALOG, product);
}
