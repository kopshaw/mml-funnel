"use client";

import { useState } from "react";
import { MessageSquare, Phone, Mail, Bot } from "lucide-react";

const conversations = [
  {
    id: "1",
    contact: "Sarah Mitchell",
    email: "sarah@acme.co",
    channel: "sms",
    status: "qualified",
    lastMessage: "That sounds great! I'd love to book a call to discuss further.",
    messageCount: 4,
    leadScore: 85,
    updatedAt: "2 hours ago",
  },
  {
    id: "2",
    contact: "James Rodriguez",
    email: "james@techstart.io",
    channel: "email",
    status: "active",
    lastMessage: "What kind of results have your other clients seen?",
    messageCount: 2,
    leadScore: 45,
    updatedAt: "4 hours ago",
  },
  {
    id: "3",
    contact: "Emily Chen",
    email: "emily@growthco.com",
    channel: "sms",
    status: "booked",
    lastMessage: "Confirmed! See you Thursday at 2pm.",
    messageCount: 6,
    leadScore: 92,
    updatedAt: "1 day ago",
  },
  {
    id: "4",
    contact: "Michael Brown",
    email: "michael@scale.dev",
    channel: "email",
    status: "escalated",
    lastMessage: "I have some specific questions about your pricing model...",
    messageCount: 5,
    leadScore: 60,
    updatedAt: "1 day ago",
  },
  {
    id: "5",
    contact: "Lisa Park",
    email: "lisa@brandhaus.co",
    channel: "sms",
    status: "disqualified",
    lastMessage: "Thanks but we're a very early stage startup with no budget right now.",
    messageCount: 3,
    leadScore: 15,
    updatedAt: "2 days ago",
  },
];

const sampleMessages = [
  { role: "assistant", content: "Hey Sarah! Thanks for your interest in our business ops consulting. I noticed you signed up through our VSL — what caught your eye about streamlining your operations?", time: "10:32 AM" },
  { role: "user", content: "We're growing fast but our processes are a mess. Spending too much time on admin stuff instead of growth.", time: "10:45 AM" },
  { role: "assistant", content: "That's super common at your stage — and it's actually a great sign that you're recognizing it now. Quick question: roughly how many hours per week do you think you and your team lose to manual processes?", time: "10:46 AM" },
  { role: "user", content: "Probably 15-20 hours across the team. It's getting worse as we hire.", time: "11:02 AM" },
  { role: "assistant", content: "15-20 hours is significant — that's basically half a full-time hire's worth of wasted time. We've helped companies in similar situations cut that by 60-70%. Would a quick 30-min strategy call make sense so Steve can map out what that would look like for you specifically?", time: "11:03 AM" },
  { role: "user", content: "That sounds great! I'd love to book a call to discuss further.", time: "11:15 AM" },
];

const statusColors: Record<string, string> = {
  active: "bg-blue-500/20 text-blue-400",
  qualified: "bg-green-500/20 text-green-400",
  booked: "bg-emerald-500/20 text-emerald-400",
  escalated: "bg-yellow-500/20 text-yellow-400",
  disqualified: "bg-slate-500/20 text-slate-400",
};

const channelIcons: Record<string, typeof Phone> = {
  sms: Phone,
  email: Mail,
  chat: MessageSquare,
};

export default function ConversationsPage() {
  const [selectedConv, setSelectedConv] = useState(conversations[0]);

  const stats = [
    { label: "Total Conversations", value: "47" },
    { label: "Qualified", value: "18", sub: "38%" },
    { label: "Booked", value: "12", sub: "26%" },
    { label: "Avg Messages to Qualify", value: "3.8" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">AI Conversations</h1>
      <p className="text-slate-400 mb-6">Monitor AI-driven lead qualification and follow-up conversations.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">{s.label}</p>
            <p className="text-2xl font-bold text-white mt-1">
              {s.value}
              {s.sub && <span className="text-sm font-normal text-slate-500 ml-2">{s.sub}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Conversation List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white">Conversations</h2>
          </div>
          <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto">
            {conversations.map((conv) => {
              const ChannelIcon = channelIcons[conv.channel] || MessageSquare;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full text-left p-4 hover:bg-slate-800/50 transition-colors ${selectedConv.id === conv.id ? "bg-slate-800/70" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{conv.contact}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[conv.status]}`}>
                      {conv.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mb-1">{conv.lastMessage}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <ChannelIcon className="w-3 h-3" />
                    <span>{conv.messageCount} messages</span>
                    <span>·</span>
                    <span>{conv.updatedAt}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Transcript */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">{selectedConv.contact}</h2>
              <p className="text-xs text-slate-500">{selectedConv.email} · Lead Score: {selectedConv.leadScore}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[selectedConv.status]}`}>
              {selectedConv.status}
            </span>
          </div>
          <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[520px]">
            {sampleMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "assistant"
                    ? "bg-slate-800 text-slate-200"
                    : "bg-blue-600 text-white"
                }`}>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1 mb-1">
                      <Bot className="w-3 h-3 text-blue-400" />
                      <span className="text-xs text-blue-400 font-medium">AI Agent</span>
                    </div>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.role === "assistant" ? "text-slate-500" : "text-blue-200"}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
