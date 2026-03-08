import type { MyDataOrder } from "./myDataPageData";
import {
  AccordionCard,
  formatDate,
  InfoRow,
  MiniAccordion,
  Pill,
} from "./myDataPagePrimitives";

export function MyDataOrdersSection({
  orders,
  isKakaoLoggedIn,
  phoneLinked,
  lastOrderAt,
}: {
  orders: MyDataOrder[];
  isKakaoLoggedIn: boolean;
  phoneLinked: boolean;
  lastOrderAt?: Date | null;
}) {
  return (
    <div id="my-data-orders">
      <AccordionCard
        title="주문 내역"
        subtitle={
          isKakaoLoggedIn && !phoneLinked
            ? "전화번호 인증을 완료해야 계정에 주문이 연결됩니다."
            : "주문 1건씩 펼쳐서 상세를 확인하세요."
        }
        right={
          <div className="flex items-center gap-2">
            <Pill>{orders.length}건</Pill>
            <Pill tone={isKakaoLoggedIn && !phoneLinked ? "warn" : "neutral"}>
              최근: {formatDate(lastOrderAt)}
            </Pill>
          </div>
        }
      >
        {orders.length === 0 ? (
          <p className="text-sm text-gray-500">주문 내역이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const itemCount = order.orderItems?.length ?? 0;
              return (
                <MiniAccordion
                  key={order.id}
                  title={`주문 #${order.id}`}
                  subtitle={`${formatDate(order.createdAt)} · ${
                    order.pharmacy?.name ?? "약국 미지정"
                  } · 상품 ${itemCount}개`}
                  right={<Pill>{order.status ?? "상태 미기록"}</Pill>}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoRow label="약국" value={order.pharmacy?.name ?? "-"} />
                    <InfoRow label="전화번호" value={order.phone ?? "-"} />
                    <InfoRow
                      label="주소"
                      value={
                        order.roadAddress
                          ? `${order.roadAddress} ${order.detailAddress ?? ""}`
                          : "-"
                      }
                    />
                    <InfoRow label="요청사항" value={order.requestNotes ?? "-"} />
                  </div>

                  <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-gray-100">
                    <div className="text-sm font-extrabold text-gray-900">주문 상품</div>
                    {order.orderItems.length === 0 ? (
                      <p className="mt-2 text-xs text-gray-500">
                        주문 상품 정보가 없습니다.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2 text-sm text-gray-700">
                        {order.orderItems.map((item) => (
                          <li
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-gray-900">
                                {item.pharmacyProduct?.product?.name ?? "상품"}
                              </div>
                              <div className="mt-0.5 text-xs text-gray-500">
                                {item.pharmacyProduct?.optionType
                                  ? `옵션: ${item.pharmacyProduct.optionType}`
                                  : "옵션 없음"}
                              </div>
                            </div>
                            <Pill>수량: {item.quantity ? item.quantity : 0}</Pill>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </MiniAccordion>
              );
            })}
          </div>
        )}
      </AccordionCard>
    </div>
  );
}
