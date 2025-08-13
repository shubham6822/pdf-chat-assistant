"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GoogleGenAI } from "@google/genai";
import {
  Upload,
  Send,
  FileText,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Bot,
  User,
} from "lucide-react";
import Image from "next/image";

interface Citation {
  page: number;
  text: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function PDFChatApp() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfViewerRef = useRef<HTMLIFrameElement>(null);

  const ai = new GoogleGenAI({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY!,
  });

  // Mock AI responses with citations
  const mockResponses = [
    "Based on the document, this appears to be a comprehensive report covering multiple topics. The main sections are outlined in [Page 1] and detailed throughout the document. Key findings can be found on [Page 3] and [Page 7].",
    "The document discusses several important concepts. The introduction on [Page 1] provides context, while the methodology is explained in detail on [Page 4]. Results are presented starting from [Page 8].",
    "According to the content, the main conclusions are summarized on [Page 12]. The recommendations section on [Page 15] provides actionable insights based on the analysis.",
    "The document contains detailed information about the subject matter. Key statistics are presented in [Page 6], and comparative analysis can be found on [Page 9] and [Page 11].",
    "This appears to be a well-structured document with clear sections. The executive summary on [Page 2] provides an overview, while detailed explanations begin on [Page 5].",
  ];

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    console.log("fetching", file?.arrayBuffer());
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      const formData = new FormData();
      formData.set("pdf", file);
      console.log("fetching data", formData);
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "How does AI work?",
      });
      console.log("test", response.text);
      // Add welcome message when PDF is uploaded
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: response.text ?? "",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  };

  const navigateToPage = (page: number) => {
    setCurrentPage(page);
    if (pdfViewerRef.current && pdfUrl) {
      pdfViewerRef.current.src = `${pdfUrl}#page=${page}&toolbar=1&navpanes=0&scrollbar=1`;
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      navigateToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    navigateToPage(currentPage + 1);
  };

  const extractCitations = (content: string): Citation[] => {
    const citations: Citation[] = [];
    const citationRegex = /\[Page (\d+)\]/g;
    let match;

    while ((match = citationRegex.exec(content)) !== null) {
      citations.push({
        page: parseInt(match[1]),
        text: `Page ${match[1]}`,
      });
    }

    return citations;
  };

  const renderMessageWithCitations = (content: string) => {
    const citations = extractCitations(content);

    if (citations.length === 0) {
      return <div className="whitespace-pre-wrap">{content}</div>;
    }

    let lastIndex = 0;
    const elements: React.ReactNode[] = [];

    citations.forEach((citation, index) => {
      const citationText = `[Page ${citation.page}]`;
      const citationIndex = content.indexOf(citationText, lastIndex);

      if (citationIndex > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>
            {content.substring(lastIndex, citationIndex)}
          </span>
        );
      }

      elements.push(
        <Button
          key={`citation-${index}`}
          variant="outline"
          size="sm"
          className="mx-1 h-6 px-2 text-xs inline-flex items-center"
          onClick={() => navigateToPage(citation.page)}
        >
          <FileText className="h-3 w-3 mr-1" />
          Page {citation.page}
        </Button>
      );

      lastIndex = citationIndex + citationText.length;
    });

    if (lastIndex < content.length) {
      elements.push(<span key="text-end">{content.substring(lastIndex)}</span>);
    }

    return <div className="whitespace-pre-wrap">{elements}</div>;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !pdfFile) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response delay
    setTimeout(() => {
      const randomResponse =
        mockResponses[Math.floor(Math.random() * mockResponses.length)];

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: randomResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex gap-2">
            <Image
              src="/bot.png"
              alt="PDF Viewer"
              className="h-8 w-8"
              width={50}
              height={50}
            />
            PDF Chat Assistant
          </h1>
          <p className="text-gray-600">
            Upload a PDF document and chat about its contents
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* PDF Viewer Section */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                PDF Viewer
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {!pdfFile ? (
                <div
                  className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 hover:cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4 text-center">
                    Upload a PDF file to get started
                  </p>
                  <Button className="mb-4">Choose PDF File</Button>
                  <p className="text-xs text-gray-500 text-center">
                    summaries, asks questions, and more!
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600 truncate max-w-[200px]">
                      {pdfFile.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={goToPrevPage}
                        disabled={currentPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-gray-500 min-w-[80px] text-center">
                        Page {currentPage}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={goToNextPage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change File
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 border rounded-lg overflow-hidden bg-white">
                    <iframe
                      ref={pdfViewerRef}
                      src={`${pdfUrl}#page=${currentPage}&toolbar=1&navpanes=0&scrollbar=1`}
                      className="w-full h-full"
                      title="PDF Viewer"
                    />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Section */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Chat Assistant
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-auto">
                  Chat Mode
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 mb-4 p-4 border rounded-lg bg-white">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      {pdfFile
                        ? "Ask me anything about your PDF document!"
                        : "Upload a PDF file to start chatting about its contents"}
                    </div>
                  )}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {message.role === "assistant" && (
                            <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          )}
                          {message.role === "user" && (
                            <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            {message.role === "assistant" ? (
                              renderMessageWithCitations(message.content)
                            ) : (
                              <div className="whitespace-pre-wrap">
                                {message.content}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-3">
                        <div className="flex items-center gap-2">
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
                </div>
              </ScrollArea>

              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    pdfFile
                      ? "Ask about your PDF..."
                      : "Upload a PDF first to start chatting"
                  }
                  disabled={!pdfFile || isLoading}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!pdfFile || !input.trim() || isLoading}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              {pdfFile && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() =>
                      handleQuickQuestion("What is this document about?")
                    }
                  >
                    What is this document about?
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() =>
                      handleQuickQuestion("Summarize the key points")
                    }
                  >
                    Summarize key points
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() =>
                      handleQuickQuestion("Find specific information")
                    }
                  >
                    Find information
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
