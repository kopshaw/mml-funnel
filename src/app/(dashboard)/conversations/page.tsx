import {
  getConversations,
  getConversationStats,
  getConversationMessages,
} from "@/lib/queries/conversation-queries";
import ConversationsClient from "./conversations-client";

export default async function ConversationsPage() {
  const [{ data: conversations }, stats] = await Promise.all([
    getConversations(undefined, { limit: 50 }),
    getConversationStats(),
  ]);

  // Flatten contacts array from Supabase join to single object
  const normalizedConversations = conversations.map((c: any) => ({
    ...c,
    contacts: Array.isArray(c.contacts) ? c.contacts[0] || null : c.contacts,
  }));

  // Pre-fetch messages for the first conversation so user sees them immediately
  let initialMessages: any[] = [];
  if (normalizedConversations.length > 0) {
    initialMessages = await getConversationMessages(normalizedConversations[0].id);
  }

  return (
    <ConversationsClient
      initialConversations={normalizedConversations}
      initialStats={stats}
      initialMessages={initialMessages}
    />
  );
}
