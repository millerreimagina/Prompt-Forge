"use client";

import * as React from "react";
import { Bot, CornerDownLeft, User, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { Optimizer } from "@/lib/types";
import { optimizers } from "@/lib/optimizers";
import { generateOptimizedContent } from "@/ai/flows/generate-optimized-content";
import Header from "@/components/header";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [selectedOptimizer, setSelectedOptimizer] = React.useState<Optimizer | null>(optimizers[0] || null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);
  
  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !selectedOptimizer || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await generateOptimizedContent({
        optimizerId: selectedOptimizer.id,
        userInput: input,
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: result.optimizedContent,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error generating content:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      <main className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r bg-card hidden md:flex flex-col">
          <div className="p-4">
            <h2 className="text-xl font-semibold tracking-tight">Optimizers</h2>
            <p className="text-sm text-muted-foreground mt-1">Select a profile for your task</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {optimizers.map((optimizer) => (
                <Card
                  key={optimizer.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedOptimizer?.id === optimizer.id && "ring-2 ring-primary"
                  )}
                  onClick={() => {
                    setSelectedOptimizer(optimizer);
                    setMessages([]);
                  }}
                >
                  <CardHeader className="p-4">
                    <CardTitle className="text-base flex justify-between items-start">
                      {optimizer.name}
                      {optimizer.status === 'Draft' && <Badge variant="outline">Draft</Badge>}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2">{optimizer.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </aside>

        <div className="flex-1 flex flex-col">
          <div className="border-b p-4 flex items-center justify-between">
            {selectedOptimizer ? (
              <div>
                <h3 className="font-semibold text-lg">{selectedOptimizer.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedOptimizer.description}</p>
              </div>
            ) : (
              <div className="text-muted-foreground">Select an optimizer to start</div>
            )}
          </div>
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Sparkles className="w-12 h-12 mb-4" />
                  <p className="text-lg">Welcome to PromptForge</p>
                  <p>Your AI-powered content generation assistant.</p>
                </div>
              )}
              {messages.map((message, index) => (
                <div key={index} className={cn("flex items-start gap-4", message.role === "user" ? "justify-end" : "")}>
                  {message.role === "assistant" && (
                    <Avatar Icon={Bot} />
                  )}
                  <div className={cn("rounded-lg px-4 py-3 max-w-xl", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border')}>
                    <pre className="whitespace-pre-wrap font-body text-sm">{message.content}</pre>
                  </div>
                  {message.role === "user" && (
                    <Avatar Icon={User} />
                  )}
                </div>
              ))}
              {isLoading && (
                 <div className="flex items-start gap-4">
                    <Avatar Icon={Bot} />
                    <div className="rounded-lg px-4 py-3 max-w-xl bg-card border flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Generating...</span>
                    </div>
                 </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <form
              onSubmit={handleSendMessage}
              className="relative"
            >
              <Label htmlFor="message" className="sr-only">Message</Label>
              <Input
                id="message"
                placeholder={selectedOptimizer ? `Ask ${selectedOptimizer.name}...` : "Select an optimizer first"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!selectedOptimizer || isLoading}
                className="pr-16"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute top-1/2 right-2 -translate-y-1/2"
                    disabled={!input.trim() || isLoading}
                  >
                    <CornerDownLeft className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send message</TooltipContent>
              </Tooltip>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

const Avatar = ({ Icon }: { Icon: React.ElementType }) => (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-muted-foreground" />
    </div>
);
