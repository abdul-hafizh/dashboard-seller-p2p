"use client";

import { useEffect, useState } from "react";
import { StreamChat, type Event } from "stream-chat";
import { useChatToken } from "./use-stream-chat";

/** A standalone StreamChat connection used only to track the merchant/admin's
 * total unread message count for the Topbar bell — kept separate from the
 * chat page's own client (built via stream-chat-react's useCreateChatClient)
 * so the bell works on every dashboard page, not just /dashboard/chat.
 * A fresh client is created per effect run (never a shared/module-level
 * instance), so React Strict Mode's dev-only double-invoke just
 * connects+disconnects+reconnects harmlessly instead of racing a shared
 * connection like the one useCreateChatClient was written to guard against. */
export function useChatUnreadCount() {
  const { data: tokenData } = useChatToken();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!tokenData) return;
    const client = new StreamChat(tokenData.apiKey);
    let cancelled = false;

    client
      .connectUser(
        { id: tokenData.userId, name: tokenData.fullName ?? tokenData.userId, image: tokenData.avatar ?? undefined },
        tokenData.token,
      )
      .then((res) => {
        if (cancelled) return;
        setCount(res?.me?.total_unread_count ?? 0);
      })
      .catch((err) => console.error("Failed to connect chat client for unread count:", err));

    const handleEvent = (event: Event) => {
      if (typeof event.total_unread_count === "number") setCount(event.total_unread_count);
    };
    client.on(handleEvent);

    return () => {
      cancelled = true;
      client.off(handleEvent);
      client.disconnectUser().catch(() => {});
    };
  }, [tokenData]);

  return count;
}
