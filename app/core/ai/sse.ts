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

/**
 * Serializes a regenerate stream event into SSE wire format.
 *
 * This keeps the route handler logic small and guarantees that every regenerate
 * event uses a consistent `event:` and `data:` payload structure.
 *
 * @param event Typed regenerate stream event payload.
 * @returns SSE-formatted event string ready to enqueue to the response stream.
 */
export function formatSseEvent(event: SseEventPayload) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
