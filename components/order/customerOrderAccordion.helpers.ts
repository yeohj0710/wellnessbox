type TimestampedMessage = {
  id?: number;
  createdAt?: string | Date | null;
};

export function sortMessagesByCreatedAt<T extends TimestampedMessage>(
  messages: readonly T[]
) {
  return [...messages].sort((left, right) => {
    const leftTime = new Date(left.createdAt ?? 0).getTime();
    const rightTime = new Date(right.createdAt ?? 0).getTime();
    return leftTime - rightTime;
  });
}

export function getLastMessageId<T extends { id?: number }>(
  messages: readonly T[]
) {
  const last = messages[messages.length - 1];
  return typeof last?.id === "number" ? last.id : 0;
}
