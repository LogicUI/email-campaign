import type {
  RegenerateStreamBodyDeltaEvent,
  RegenerateStreamErrorEvent,
  RegenerateStreamFinalEvent,
  RegenerateStreamStartEvent,
} from "@/types/api";

type SseEventPayload =
  | RegenerateStreamStartEvent
  | RegenerateStreamBodyDeltaEvent
  | RegenerateStreamFinalEvent
  | RegenerateStreamErrorEvent;

export function formatSseEvent(event: SseEventPayload) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
