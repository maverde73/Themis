"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChatMessage {
  id: string;
  content: string;
  isFromManager: boolean;
  timestamp: string;
}

interface ChatPanelProps {
  reportId: string;
}

export function ChatPanel({ reportId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);

    // TODO: Encrypt message with reporter's public key and send via relay
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input,
      isFromManager: true,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setSending(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          Secure Chat — Report {reportId.slice(0, 8)}...
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 overflow-y-auto border rounded p-3 mb-3 space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center mt-8">
              No messages yet. Start a conversation with the reporter.
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isFromManager ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-lg px-3 py-2 max-w-[70%] text-sm ${
                    msg.isFromManager
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={sending || !input.trim()}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
