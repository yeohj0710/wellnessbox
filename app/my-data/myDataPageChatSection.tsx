import type { MyDataChatSession } from "./myDataPageData";
import {
  AccordionCard,
  formatDate,
  MiniAccordion,
  Pill,
} from "./myDataPagePrimitives";
import {
  formatChatRoleLabel,
  formatChatScopeLabel,
  formatChatStatusLabel,
} from "./myDataPageLabels";

export function MyDataChatSection({
  chatSessions,
  lastChatAt,
}: {
  chatSessions: MyDataChatSession[];
  lastChatAt?: Date | null;
}) {
  return (
    <AccordionCard
      title="AI 맞춤 상담"
      subtitle="상담 세션 1개씩 펼치고, 메시지는 내부에서 스크롤로 확인합니다."
      right={
        <div className="flex items-center gap-2">
          <Pill>{chatSessions.length}개</Pill>
          <Pill>최근: {formatDate(lastChatAt)}</Pill>
        </div>
      }
    >
      {chatSessions.length === 0 ? (
        <p className="text-sm text-gray-500">저장된 상담 내역이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {chatSessions.map((session) => {
            const messageCount = session.messages?.length ?? 0;
            const scope = session.appUserId ? "account" : "device";

            return (
              <MiniAccordion
                key={session.id}
                title={session.title}
                subtitle={`${formatDate(session.updatedAt)} · 메시지 ${messageCount}개`}
                right={
                  <div className="flex items-center gap-2">
                    <Pill>{formatChatScopeLabel(scope)}</Pill>
                    <Pill>{formatChatStatusLabel(session.status)}</Pill>
                  </div>
                }
              >
                {messageCount === 0 ? (
                  <p className="text-sm text-gray-500">메시지가 없습니다.</p>
                ) : (
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-100">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-extrabold text-gray-900">메시지</div>
                      <Pill>{messageCount}개</Pill>
                    </div>

                    <div className="mt-3 max-h-[520px] space-y-3 overflow-auto pr-1">
                      {session.messages.map((message) => (
                        <div
                          key={message.id}
                          className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-extrabold text-gray-700">
                              {formatChatRoleLabel(message.role)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(message.createdAt)}
                            </div>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-800">
                            {message.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </MiniAccordion>
            );
          })}
        </div>
      )}
    </AccordionCard>
  );
}
