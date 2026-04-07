"use client";

import { useState } from "react";
import { MessageSquare, Phone, Mail, Bot, Inbox } from "lucide-react";

interface ConversationItem {
  id: string;
  contact_id: string;
  channel: string;
  status: string;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  contacts: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface ConversationStats {
  total: number;
  qualified: number;
  booked: number;
  avgMessageCount: number;
}

interface ConversationsClientProps {
  initialConversations: ConversationItem[];
  initialStats: ConversationStats;
  initialMessages: any[];
}

const statusColors: Record<string, string> = {
  active: "bg-blue-500/20 text-blue-400",
  qualified: "bg-green-500/20 text-green-400",
  booked: "bg-emerald-500/20 text-emerald-400",
  escalated: "bg-yellow-500/20 text-yellow-400",
  disqualified: "bg-slate-500/20 text-slate-400",
  closed: "bg-slate-500/20 text-slate-400",
  paused: "bg-amber-500/20 text-amber-400",
  completed: "bg-emerald-500/20 text-emerald-400",
};

const channelIcons: Record<string, typeof Phone> = {
  sms: Phone,
  email: Mail,
  chat: MessageSquare,
  voice: Phone,
};

export default function ConversationsClient({
  initialConversations,
  initialStats,
  initialMessages,
}: ConversationsClientProps) {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(
    initialConversations.length > 0 ? initialConversations[0].id : null
  );

  const selectedConv = initialConversations.find(
    (c) => c.id === selectedConvId
  );

  // Use initial messages for the first selected conversation
  const messages =
    selectedConvId === initialConversations[0]?.id ? initialMessages : [];

  const stats = [
    { label: "Total Conversations", value: initialStats.total.toString() },
    {
      label: "Qualified",
      value: initialStats.qualified.toString(),
      sub:
        initialStats.total > 0
          ? `${Math.round(
              (initialStats.qualified / initialStats.total) * 100
            )}%`
          : undefined,
    },
    {
      label: "Booked",
      value: initialStats.booked.toString(),
      sub:
        initialStats.total > 0
          ? `${Math.round(
              (initialStats.booked / initialStats.total) * 100
            )}%`
          : undefined,
    },
    {
      label: "Avg Messages",
      value: initialStats.avgMessageCount.toString(),
    },
  ];

  function getContactName(conv: ConversationItem): string {
    if (!conv.contacts) return "Unknown Contact";
    return (
      [conv.contacts.first_name, conv.contacts.last_name]
        .filter(Boolean)
        .join(" ") || conv.contacts.email || "Unknown Contact"
    );
  }

  function getContactEmail(conv: ConversationItem): string {
    return conv.contacts?.email ?? "";
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">AI Conversations</h1>
      <p className="text-slate-400 mb-6">
        Monitor AI-driven lead qualification and follow-up conversations.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4"
          >
            <p className="text-sm text-slate-400">{s.label}</p>
            <p className="text-2xl font-bold text-white mt-1">
              {s.value}
              {s.sub && (
                <span className="text-sm font-normal text-slate-500 ml-2">
                  {s.sub}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      {initialConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-6 py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
            <Inbox className="h-7 w-7 text-slate-500" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-white">
            No conversations yet
          </h3>
          <p className="mt-1.5 max-w-sm text-center text-sm text-slate-400">
            AI conversations will appear here once leads start engaging through
            your funnels.
          </p>
        </div>
      ) : (
        /* Conversation List + Detail */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white">
                Conversations
              </h2>
            </div>
            <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto">
              {initialConversations.map((conv) => {
                const ChannelIcon =
                  channelIcons[conv.channel] || MessageSquare;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left p-4 hover:bg-slate-800/50 transition-colors ${
                      selectedConvId === conv.id ? "bg-slate-800/70" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">
                        {getContactName(conv)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          statusColors[conv.status] ??
                          "bg-slate-500/20 text-slate-400"
                        }`}
                      >
                        {conv.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <ChannelIcon className="w-3 h-3" />
                      <span>{conv.message_count ?? 0} messages</span>
                      <span>·</span>
                      <span>
                        {conv.last_message_at
                          ? new Date(conv.last_message_at).toLocaleDateString()
                          : "No messages"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transcript */}
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col">
            {selectedConv ? (
              <>
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      {getContactName(selectedConv)}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {getContactEmail(selectedConv)} · {selectedConv.channel}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      statusColors[selectedConv.status] ??
                      "bg-slate-500/20 text-slate-400"
                    }`}
                  >
                    {selectedConv.status}
                  </span>
                </div>
                <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[520px]">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-slate-500">
                        No message transcript available
                      </p>
                    </div>
                  ) : (
                    messages.map((msg: any, i: number) => (
                      <div
                        key={i}
                        className={`flex ${
                          msg.role === "assistant"
                            ? "justify-start"
                            : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            msg.role === "assistant"
                              ? "bg-slate-800 text-slate-200"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {msg.role === "assistant" && (
                            <div className="flex items-center gap-1 mb-1">
                              <Bot className="w-3 h-3 text-blue-400" />
                              <span className="text-xs text-blue-400 font-medium">
                                AI Agent
                              </span>
                            </div>
                          )}
                          <p className="text-sm">{msg.content}</p>
                          {msg.time && (
                            <p
                              className={`text-xs mt-1 ${
                                msg.role === "assistant"
                                  ? "text-slate-500"
                                  : "text-blue-200"
                              }`}
                            >
                              {msg.time}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-sm text-slate-500">
                  Select a conversation to view
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
