"use client";

import type React from "react";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  MessageCircle,
  Users,
  FileText,
  Download,
  ImageIcon,
  Paperclip,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  sender: string;
  senderId: string;
  message: string;
  timestamp: Date;
  type: "message" | "system" | "file" | "image";
  fileUrl?: string;
  fileName?: string;
  isOwn?: boolean;
}

interface RealTimeChatProps {
  roomId: string;
  participantName: string;
  participantId: string;
  isHost: boolean;
  onMessageCount?: (count: number) => void;
}

export function RealTimeChat({
  roomId,
  participantName,
  participantId,
  isHost,
  onMessageCount,
}: RealTimeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([participantName]);
  const [isConnected, setIsConnected] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate WebSocket connection for real-time features
    const connectToChat = () => {
      setIsConnected(true);
      addSystemMessage("Connected to chat");

      // Simulate other participant joining
      setTimeout(() => {
        setOnlineUsers((prev) => [...prev, isHost ? "Candidate" : "Recruiter"]);
        addSystemMessage(
          `${isHost ? "Candidate" : "Recruiter"} joined the chat`
        );
      }, 2000);
    };

    connectToChat();

    return () => {
      setIsConnected(false);
    };
  }, [roomId, isHost]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    onMessageCount?.(messages.length);
  }, [messages.length, onMessageCount]);

  const addSystemMessage = useCallback((content: string) => {
    const systemMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      sender: "System",
      senderId: "system",
      message: content,
      timestamp: new Date(),
      type: "system",
      isOwn: false,
    };
    setMessages((prev) => [...prev, systemMessage]);
  }, []);

  const sendMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: participantName,
      senderId: participantId,
      message: newMessage.trim(),
      timestamp: new Date(),
      type: "message",
      isOwn: true,
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");

    // Simulate receiving a response (for demo purposes)
    setTimeout(() => {
      const responseMessage: ChatMessage = {
        id: `response-${Date.now()}`,
        sender: isHost ? "Candidate" : "Recruiter",
        senderId: "other-participant",
        message: "Thank you for that information!",
        timestamp: new Date(),
        type: "message",
        isOwn: false,
      };
      setMessages((prev) => [...prev, responseMessage]);
    }, 1000 + Math.random() * 2000);

    // Clear typing indicator
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [newMessage, participantName, participantId, isHost]);

  const handleTyping = useCallback(
    (value: string) => {
      setNewMessage(value);

      if (!isTyping && value.trim()) {
        setIsTyping(true);
        // In real implementation, emit typing event to other participants
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    },
    [isTyping]
  );

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      // Create file message
      const fileMessage: ChatMessage = {
        id: `file-${Date.now()}`,
        sender: participantName,
        senderId: participantId,
        message: `Shared a file: ${file.name}`,
        timestamp: new Date(),
        type: file.type.startsWith("image/") ? "image" : "file",
        fileName: file.name,
        fileUrl: URL.createObjectURL(file),
        isOwn: true,
      };

      setMessages((prev) => [...prev, fileMessage]);

      toast({
        title: "File Shared",
        description: `${file.name} has been shared in the chat.`,
      });

      // Reset file input
      event.target.value = "";
    },
    [participantName, participantId, toast]
  );

  const downloadFile = useCallback((fileUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  }, []);

  const exportChatHistory = useCallback(() => {
    const chatHistory = messages
      .filter((msg) => msg.type !== "system")
      .map(
        (msg) =>
          `[${format(msg.timestamp, "HH:mm:ss")}] ${msg.sender}: ${msg.message}`
      )
      .join("\n");

    const blob = new Blob([chatHistory], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `interview-chat-${roomId}-${format(
      new Date(),
      "yyyy-MM-dd"
    )}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Chat Exported",
      description: "Chat history has been downloaded.",
    });
  }, [messages, roomId, toast]);

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-600 flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center text-white">
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat
            {!isConnected && (
              <Badge variant="destructive" className="ml-2 text-xs">
                Offline
              </Badge>
            )}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportChatHistory}
            disabled={messages.length === 0}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>

        {/* Online Users */}
        <div className="mt-2 flex items-center text-sm text-gray-400">
          <Users className="w-3 h-3 mr-1" />
          <span>{onlineUsers.length} online</span>
          <div className="flex ml-2 space-x-1">
            {onlineUsers.map((user, index) => (
              <div key={index} className="w-2 h-2 bg-green-500 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.type === "system"
                    ? "bg-blue-900/50 border border-blue-700 text-center mx-auto"
                    : msg.isOwn
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-white"
                }`}
              >
                {msg.type !== "system" && (
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm">{msg.sender}</span>
                    <span className="text-xs opacity-70 ml-2">
                      {format(msg.timestamp, "HH:mm")}
                    </span>
                  </div>
                )}

                {msg.type === "image" && msg.fileUrl && (
                  <div className="mb-2">
                    <img
                      src={msg.fileUrl || "/placeholder.svg"}
                      alt={msg.fileName}
                      className="max-w-full h-auto rounded cursor-pointer"
                      onClick={() => window.open(msg.fileUrl, "_blank")}
                    />
                  </div>
                )}

                {msg.type === "file" && msg.fileUrl && (
                  <div className="mb-2 p-2 bg-gray-600 rounded flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      <span className="text-sm truncate">{msg.fileName}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadFile(msg.fileUrl!, msg.fileName!)}
                      className="p-1 h-auto"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                <p
                  className={`text-sm ${
                    msg.type === "system" ? "text-blue-300" : ""
                  }`}
                >
                  {msg.message}
                </p>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-700 rounded-lg p-3 max-w-[80%]">
                <div className="flex items-center space-x-1">
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
                  <span className="text-xs text-gray-400 ml-2">
                    {typingUsers.join(", ")} typing...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-600">
        <div className="flex items-center space-x-2 mb-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 h-auto text-gray-400 hover:text-white"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 h-auto text-gray-400 hover:text-white"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="bg-gray-700 border-gray-600 text-white flex-1"
            disabled={!isConnected}
          />
          <Button
            size="sm"
            onClick={sendMessage}
            disabled={!newMessage.trim() || !isConnected}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {isTyping && (
          <div className="mt-1 text-xs text-gray-400">You are typing...</div>
        )}
      </div>
    </div>
  );
}
