import { stripPartialFailureMarker } from "@/lib/chat/stream-protocol";

export async function readStreamingText(
  response: Response,
  onText: (textSoFar: string) => void
) {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let done = false;
  let fullText = "";

  while (!done) {
    const { value, done: chunkDone } = await reader.read();
    done = chunkDone;
    if (!value) continue;
    fullText += decoder.decode(value, { stream: !chunkDone });
    // The trailing failure marker is protocol, not prose - never show it.
    onText(stripPartialFailureMarker(fullText));
  }

  fullText += decoder.decode();
  return fullText;
}
