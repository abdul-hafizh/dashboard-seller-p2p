"use client";

import "stream-chat-react/dist/css/index.css";
import {
  Chat,
  Channel,
  ChannelHeader,
  ChannelList,
  ComponentProvider,
  MessageComposer,
  MessageList,
  Thread,
  Window,
  useCreateChatClient,
} from "stream-chat-react";
import { useChatToken, type ChatTokenData } from "@/lib/hooks/use-stream-chat";
import { useAuth } from "@/lib/auth-context";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { CustomAttachment } from "@/components/chat/CustomAttachment";
import { ShareActions } from "@/components/chat/ShareActions";

// Only mounted once `tokenData` is available, so `useCreateChatClient` (which
// must run unconditionally, like any hook) always gets real values — it
// never needs to be called with placeholder/empty ones while waiting.
function ChatWindow({ tokenData, userId }: { tokenData: ChatTokenData; userId: string }) {
  const client = useCreateChatClient({
    apiKey: tokenData.apiKey,
    tokenOrProvider: tokenData.token,
    userData: {
      id: tokenData.userId,
      name: tokenData.fullName ?? tokenData.userId,
      image: tokenData.avatar ?? undefined,
    },
  });

  if (!client) return <FullPageSpinner />;

  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-border bg-surface">
      <Chat client={client}>
        <div className="flex h-full">
          <div className="w-72 shrink-0 overflow-y-auto border-r border-border">
            <ChannelList filters={{ type: "messaging", members: { $in: [userId] } }} sort={{ last_message_at: -1 }} />
          </div>
          <div className="flex min-w-0 flex-1">
            <Channel>
              <ComponentProvider value={{ Attachment: CustomAttachment, AdditionalMessageComposerActions: ShareActions }}>
                <Window>
                  <ChannelHeader />
                  <MessageList />
                  <MessageComposer />
                </Window>
                <Thread />
              </ComponentProvider>
            </Channel>
          </div>
        </div>
      </Chat>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const { data: tokenData, error } = useChatToken();

  if (error) {
    return <div className="p-6 text-sm text-error">{error}</div>;
  }

  if (!tokenData || !user) {
    return <FullPageSpinner />;
  }

  return <ChatWindow tokenData={tokenData} userId={user.Id} />;
}
