# Cart Client Map

## 목적

- `components/order/cart.tsx` 유지보수 시 수정 시작점을 빠르게 찾습니다.
- 주문 생성 무결성 코드는 건드리지 않으면서, 카트 UI/상호작용 경계를 분리해 후속 세션 생산성을 높입니다.

## 엔트리

- 메인 오케스트레이션: `components/order/cart.tsx`
- 주문 완료 오케스트레이션: `app/(orders)/order-complete/page.tsx`
- 주문 완료 보조 흐름: `app/(orders)/order-complete/orderCompleteFlow.ts`

## UI/컴포넌트 경계

- 상단 헤더: `components/order/CartTopHeader.tsx`
- 품목/상태 섹션: `components/order/cartItemsSection.tsx`
- 주소/연락처 섹션: `components/order/addressSection.tsx`
- 약국 정보 섹션: `components/order/pharmacyInfoSection.tsx`
- 결제 섹션: `components/order/paymentSection.tsx`
- 결제 확인 모달: `components/order/checkoutConfirmModal.tsx`
- 약국 상세 모달: `components/order/pharmacyDetailModal.tsx`
- 상품 상세 모달: `components/product/productDetail.tsx`
- 휴대폰 인증 모달: `app/me/phoneVerifyModal.tsx`

## 훅/유틸 경계

- 상호작용 컨트롤러: `components/order/hooks/useCartInteractionController.ts`
  - 주소 저장, 약국 재선택, 상세/모달 open-close, 장바구니 반영, 폰 모달 콜백
- 결제 오케스트레이션: `components/order/hooks/useCartPayment.ts`
  - 결제 전 유효성 검사, PortOne/KG Inicis 요청, 주문완료 라우팅
- 로그인 상태 동기화: `components/order/hooks/useCartLoginStatus.ts`
- 클라이언트 영속화: `components/order/hooks/useCartClientPersistence.ts`
- 오버레이 닫기 동작: `components/order/hooks/useCartOverlayCloseBehavior.ts`
- 휴대폰 상태/연동 해제: `components/order/hooks/usePhoneStatus.ts`
- 주소 필드 로컬 상태: `components/order/hooks/useAddressFields.ts`
- 카트 품목 영속화 헬퍼: `components/order/cartItemsSection.actions.ts`
- 옵션 일괄 변경/약국 필터: `components/order/cart.helpers.ts`
- 사용자 노출 문구: `components/order/cart.copy.ts`

## 수정 가이드

1. 카트 UI 배치 변경:
   - 먼저 `cart.tsx`가 아니라 하위 섹션 컴포넌트를 확인합니다.
2. 주소/상세/폰 모달/장바구니 상호작용 변경:
   - `useCartInteractionController.ts`를 먼저 확인합니다.
3. 결제 전 검증 또는 결제사 라우팅 변경:
   - `useCartPayment.ts`를 먼저 수정합니다.
4. 주문 생성/재고 차감 변경:
   - 클라이언트가 아니라 `lib/order/mutations.ts`와 `app/(orders)/order-complete/page.tsx`를 확인합니다.

## 빠른 검증

- `npm run qa:cart:interaction-controller-extraction`
- `npm run qa:cart:copy-extraction`
- `npm run qa:cart:login-header-extraction`
- `npm run qa:cart:client-effects-extraction`
- `npm run lint`
- `npm run build`
