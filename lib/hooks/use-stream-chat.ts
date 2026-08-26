"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export interface ChatTokenData {
  apiKey: string;
  token: string;
  userId: string;
  userType: string;
  fullName: string | null;
  avatar: string | null;
}

/** Fetches a Stream token from api-meshy via the existing `/api/backend/*`
 * proxy. Deliberately does nothing beyond that plain data fetch — no
 * StreamChat client is created or connected here, so there's no
 * connect/disconnect lifecycle for React's Strict Mode double-invoke (dev
 * only) to race against. Building the actual client from this data is the
 * caller's job, ideally via stream-chat-react's own `useCreateChatClient`,
 * which is written to be Strict-Mode-safe. */
export function useChatToken() {
  const { user } = useAuth();
  const [data, setData] = useState<ChatTokenData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    apiFetch<ChatTokenData>("chat/token")
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Gagal memuat token chat");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { data, error };
}
