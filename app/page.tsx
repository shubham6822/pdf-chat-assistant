"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useDropzone } from "react-dropzone";
import { generateChatResponse, generateFileContent } from "@/lib/actions";
import { createPartFromUri } from "@google/genai";

interface Citation {
  page: number;
  text: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
}

interface Contents {
  role: "user" | "model";
  parts: {}[];
}

export default function PDFChatApp() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCalled, setIsCalled] = useState(false);
  const [contents, setContents] = useState<Contents[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfViewerRef = useRef<HTMLIFrameElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState<string>("");
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  async function chatLoop(chats: Contents[]) {
    console.log("Contents prepared for AI:", chats);
    try {
      setIsLoading(true);

      // Call server action directly
      const result = await generateChatResponse(chats);

      setIsLoading(false);

      if (result.success) {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "model",
          content: result.text,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, newMessage]);
        setContents((prev) => [
          ...prev,
          {
            role: "model",
            parts: [
              {
                text: result.text,
              },
            ],
          },
        ]);
        // Start typing animation for the new message
        setTypingMessageId(newMessage.id);
      } else {
        // Handle error from server action
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "model",
          content: `Sorry, I encountered an error: ${
            result.error || "Unknown error"
          }. Please try again.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error in chat loop:", error);
      setIsLoading(false);

      // Show error message to user
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "model",
        content:
          "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }
  }

  useEffect(() => {
    if (isCalled) {
      chatLoop(contents).catch((error) => {
        console.error("Error in chat loop:", error);
      });
      setIsCalled(false);
    }
  }, [isCalled]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, displayedText]);

  // Typewriter effect for assistant messages
  useEffect(() => {
    if (!typingMessageId) return;

    const currentMessage = messages.find((msg) => msg.id === typingMessageId);
    if (!currentMessage || currentMessage.role !== "model") return;

    const fullText = currentMessage.content || "";
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

  useEffect(() => {
    (async () => {
      if (pdfFile) {
        setIsUploadingPdf(true);
        try {
          const file1 = await generateFileContent(pdfFile);
          let fileContent;
          if (file1.uri && file1.mimeType) {
            fileContent = createPartFromUri(file1.uri, file1.mimeType);
          }
          const pdfBuffer = await pdfFile.arrayBuffer();
          const request: Contents[] = [
            {
              role: "user" as const,
              parts: [
                {
                  fileData: {
                    fileUri: file1.uri, // From upload result
                    mimeType: file1.mimeType, // e.g. "application/pdf"
                  },
                },
                { text: `Summarize this document in 50 words ` },
              ],
            },
          ];
          setContents(request);
          chatLoop(request);
        } catch (error) {
          console.error("Error processing PDF:", error);
          // Show error message to user
          const errorMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "model",
            content:
              "Sorry, I encountered an error processing your PDF. Please try again with a different file.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        } finally {
          setIsUploadingPdf(false);
        }
      }
    })();
  }, [pdfFile]);

  const handleFileUpload = async (file: File) => {
    if (file && file.type === "application/pdf") {
      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        // Show error message to user
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "model",
          content:
            "Sorry, the PDF file is too large. Please upload a file smaller than 10MB.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setCurrentPage(1);
      setTotalPages(0); // Reset total pages
    }
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      await handleFileUpload(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
    noClick: true,
  });

  const navigateToPage = (page: number) => {
    if (page < 1) return;
    setCurrentPage(page);
    if (pdfViewerRef.current && pdfUrl) {
      // Force reload the iframe with new page
      const newSrc = `${pdfUrl}#page=${page}&toolbar=1&navpanes=0&scrollbar=1&view=FitH`;
      pdfViewerRef.current.src = newSrc;

      // Alternative method to ensure page change
      setTimeout(() => {
        if (pdfViewerRef.current) {
          pdfViewerRef.current.contentWindow?.postMessage(
            {
              type: "setPage",
              page: page,
            },
            "*"
          );
        }
      }, 100);
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

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pageNum = parseInt(e.target.value);
    if (!isNaN(pageNum) && pageNum > 0) {
      navigateToPage(pageNum);
    }
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
    setContents((prev) => [
      ...prev,
      {
        role: "user",
        parts: [
          {
            text: input,
          },
        ],
      },
    ]);
    setIsCalled(true);
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
                  {...getRootProps()}
                  className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 hover:cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4 text-center">
                    {isDragActive
                      ? "Drop the PDF file here..."
                      : "Upload a PDF file to get started"}
                  </p>
                  <Button
                    variant="secondary"
                    className="mb-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose PDF File
                  </Button>
                  <p className="text-xs text-gray-500 text-center mb-2">
                    Maximum file size: 10MB
                  </p>
                  <p className="text-xs text-gray-500 text-center">
                    {isDragActive
                      ? "Release to upload"
                      : "Drag and drop a PDF file here, or click to select"}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
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
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={currentPage}
                          onChange={handlePageInputChange}
                          className="w-16 h-8 text-sm text-center"
                          min="1"
                        />
                        {totalPages > 0 && (
                          <span className="text-sm text-gray-500">
                            of {totalPages}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={goToNextPage}
                        disabled={totalPages > 0 && currentPage >= totalPages}
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
                      key={`${pdfUrl}-${currentPage}`}
                      src={`${pdfUrl}#page=${currentPage}&toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                      className="w-full h-full"
                      title="PDF Viewer"
                    />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileInputChange}
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
                PDF Assistant
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-auto">
                  Chat Mode
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 mb-4 p-4 border rounded-lg bg-white max-h-[calc(100vh-400px)] overflow-y-auto">
                <div className="space-y-4 min-h-full">
                  {messages.length === 0 && !isLoading && !isUploadingPdf && (
                    <div className="text-center text-gray-500 py-8">
                      {pdfFile
                        ? "Ask me anything about your PDF document!"
                        : "Upload a PDF file to start chatting about its contents"}
                    </div>
                  )}

                  {isUploadingPdf && (
                    <div className="flex justify-center items-center py-8">
                      <div className="text-center">
                        <div className="flex justify-center mb-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                        <p className="text-gray-600">
                          Uploading and processing PDF...
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          This may take a few moments
                        </p>
                      </div>
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
                          {message.role === "model" && (
                            <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          )}
                          {message.role === "user" && (
                            <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            {message.role === "model" ? (
                              // Show typing animation for the current typing message
                              message.id === typingMessageId ? (
                                <div className="whitespace-pre-wrap">
                                  <span>{displayedText}</span>
                                  <span className="inline-block w-0.5 h-5 bg-gray-600 ml-0.5 animate-pulse" />
                                </div>
                              ) : (
                                renderMessageWithCitations(message.content)
                              )
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

                  {/* Invisible element to scroll to */}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isUploadingPdf
                      ? "Processing PDF..."
                      : pdfFile
                      ? "Ask about your PDF..."
                      : "Upload a PDF first to start chatting"
                  }
                  disabled={!pdfFile || isLoading || isUploadingPdf}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={
                    !pdfFile || !input.trim() || isLoading || isUploadingPdf
                  }
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              {pdfFile && !isUploadingPdf && (
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
