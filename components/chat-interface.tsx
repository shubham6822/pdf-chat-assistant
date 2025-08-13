"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ChatInterfaceProps {
  pdfFile: File;
  onCitationClick: (page: number) => void;
}

interface Citation {
  page: number;
  text: string;
}

export function ChatInterface({
  pdfFile,
  onCitationClick,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Using a simple state-based approach since the useChat hook seems to have API issues
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      role: "assistant" | "user";
      parts: Array<{ type: "text"; text: string }>;
    }>
  >([
    {
      id: "welcome",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: `Hello! I'm ready to help you analyze your PDF document "${pdfFile.name}". You can ask me questions about its content, request summaries, or ask for specific information. I'll provide citations with page numbers when referencing the document.`,
        },
      ],
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState<string>("");

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, displayedText]);

  // Fallback scroll method
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, displayedText]);

  // Typewriter effect for assistant messages
  useEffect(() => {
    if (!typingMessageId) return;

    const currentMessage = messages.find((msg) => msg.id === typingMessageId);
    if (!currentMessage || currentMessage.role !== "assistant") return;

    const fullText = currentMessage.parts[0]?.text || "";
    let currentIndex = 0;
    setDisplayedText("");

    const typeInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        setTypingMessageId(null);
        setDisplayedText("");
      }
    }, 30); // Adjust speed here (lower = faster)

    return () => clearInterval(typeInterval);
  }, [typingMessageId, messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      parts: [{ type: "text" as const, text: input }],
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Here you would typically call your chat API
    // For now, just adding a simple response
    setTimeout(() => {
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: "This is a placeholder response with some longer text to demonstrate the typewriter effect. The actual chat functionality should be implemented based on your API. You can see how each character appears one by one, creating a smooth typing animation similar to ChatGPT.",
          },
        ],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
      setTypingMessageId(assistantMessage.id);
    }, 1000);
  };

  const extractCitations = (
    text: string
  ): { text: string; citations: Citation[] } => {
    const citationRegex = /\[Page (\d+)\]/g;
    const citations: Citation[] = [];
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      citations.push({
        page: parseInt(match[1]),
        text: match[0],
      });
    }

    return { text, citations };
  };

  const renderMessageWithCitations = (text: string) => {
    const { citations } = extractCitations(text);

    if (citations.length === 0) {
      return <span>{text}</span>;
    }

    let lastIndex = 0;
    const elements: React.ReactNode[] = [];

    citations.forEach((citation, index) => {
      const citationIndex = text.indexOf(citation.text, lastIndex);

      // Add text before citation
      if (citationIndex > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, citationIndex)}
          </span>
        );
      }

      // Add citation button
      elements.push(
        <Button
          key={`citation-${index}`}
          variant="outline"
          size="sm"
          className="mx-1 h-6 px-2 text-xs"
          onClick={() => onCitationClick(citation.page)}
        >
          <FileText className="h-3 w-3 mr-1" />
          Page {citation.page}
        </Button>
      );

      lastIndex = citationIndex + citation.text.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(<span key="text-end">{text.substring(lastIndex)}</span>);
    }

    return <>{elements}</>;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <Bot className="h-5 w-5 mr-2" />
          PDF Chat Assistant
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Ask questions about "{pdfFile.name}"
        </p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.role === "assistant" && (
                    <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  {message.role === "user" && (
                    <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    {message.parts.map((part, index) => {
                      if (part.type === "text") {
                        // Show typing animation for the current typing message
                        if (
                          message.role === "assistant" &&
                          message.id === typingMessageId
                        ) {
                          return (
                            <div key={index} className="whitespace-pre-wrap">
                              <span>{displayedText}</span>
                              <span className="inline-block w-0.5 h-5 bg-gray-600 ml-0.5 animate-pulse" />
                            </div>
                          );
                        }
                        // Show full text for completed messages or user messages
                        return (
                          <div key={index} className="whitespace-pre-wrap">
                            {message.role === "assistant"
                              ? renderMessageWithCitations(part.text)
                              : part.text}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSubmit}
        className="border-t p-4 bg-gray-50 rounded-b-lg"
      >
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the PDF..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge
            variant="secondary"
            className="text-xs cursor-pointer"
            onClick={() => setInput("What is this document about?")}
          >
            What is this document about?
          </Badge>
          <Badge
            variant="secondary"
            className="text-xs cursor-pointer"
            onClick={() => setInput("Summarize the key points")}
          >
            Summarize the key points
          </Badge>
          <Badge
            variant="secondary"
            className="text-xs cursor-pointer"
            onClick={() => setInput("Find specific information about...")}
          >
            Find specific information
          </Badge>
        </div>
      </form>
    </div>
  );
}
