"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Send, Paperclip, Loader2, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface AiSurveyPanelProps {
  open: boolean;
  onClose: () => void;
  onApplySchema: (schema: Record<string, unknown>) => void;
  currentSchema: Record<string, unknown>;
}

export function AiSurveyPanel({
  open,
  onClose,
  onApplySchema,
  currentSchema,
}: AiSurveyPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [inputText, setInputText] = useState("");

  const currentSchemaRef = useRef(currentSchema);
  currentSchemaRef.current = currentSchema;

  const onApplySchemaRef = useRef(onApplySchema);
  onApplySchemaRef.current = onApplySchema;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_URL}/ai/survey-assistant`,
        headers: () => {
          const token =
            typeof window !== "undefined"
              ? localStorage.getItem("token")
              : null;
          const h: Record<string, string> = {};
          if (token) h["Authorization"] = `Bearer ${token}`;
          return h;
        },
        body: () => ({ currentSchema: currentSchemaRef.current }),
      }),
    [],
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    onToolCall({ toolCall }) {
      if (
        toolCall.toolName === "applySurveySchema" ||
        ("dynamic" in toolCall && toolCall.dynamic)
      ) {
        const input = "input" in toolCall ? toolCall.input : undefined;
        if (input && typeof input === "object") {
          onApplySchemaRef.current(input as Record<string, unknown>);
        }
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.lastElementChild?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText("");
    sendMessage({ text });
  }, [inputText, isLoading, sendMessage]);

  const handlePdfUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_URL}/ai/upload-pdf`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");
        const { text } = (await res.json()) as { text: string };

        sendMessage({
          text: `Contenuto del documento:\n---\n${text}\n---\nCrea una survey basata su questo documento.`,
        });
      } catch {
        // Silently fail - user can retry
      } finally {
        setUploading(false);
      }
    },
    [sendMessage],
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-[420px] flex-col sm:max-w-[420px]"
        showCloseButton={true}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Assistant
          </SheetTitle>
        </SheetHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-2">
          <div ref={scrollRef} className="space-y-4 pb-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-3 pt-12 text-center text-muted-foreground">
                <Bot className="h-10 w-10" />
                <p className="text-sm">
                  Descrivi la survey che vuoi creare, oppure chiedi modifiche a
                  quella attuale.
                </p>
                <div className="space-y-1 text-xs">
                  <p>&quot;Crea una survey sul clima aziendale con 5 domande&quot;</p>
                  <p>&quot;Aggiungi una domanda NPS&quot;</p>
                  <p>&quot;Traduci in inglese&quot;</p>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {m.parts.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <span key={i} className="whitespace-pre-wrap">
                          {part.text}
                        </span>
                      );
                    }
                    if (
                      part.type.startsWith("tool-") ||
                      part.type === "dynamic-tool"
                    ) {
                      return (
                        <span
                          key={i}
                          className="block text-xs italic text-muted-foreground"
                        >
                          Schema applicato all&apos;editor
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
                {m.role === "user" && (
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-lg bg-muted px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex items-center gap-2 border-t pt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePdfUpload(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={uploading || isLoading}
            onClick={() => fileInputRef.current?.click()}
            title="Carica PDF"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Descrivi la survey..."
            disabled={isLoading || uploading}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            disabled={isLoading || uploading || !inputText.trim()}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
