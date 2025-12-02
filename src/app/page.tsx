"use client";

import * as React from "react";
import { Bot, CornerDownLeft, User, Sparkles, Loader2, ChevronsUpDown, Copy, Check, Trash2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { Optimizer } from "@/lib/types";
import Header from "@/components/header";
import { cn } from "@/lib/utils";
import { useAuth, useFirestore } from "@/firebase";
import { onAuthStateChanged, type User as FirebaseUser, getIdTokenResult } from "firebase/auth";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, writeBatch, getDocs } from "firebase/firestore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getOptimizers } from "@/lib/optimizers-service";
import { Checkbox } from "@/components/ui/checkbox";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const Avatar = ({ Icon }: { Icon: React.ElementType }) => (
  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
    <Icon className="w-5 h-5 text-muted-foreground" />
  </div>
);

const ALL_ORGANIZATIONS: Optimizer['organization'][] = ['Reimagina', 'Trend Riders', 'Personal'];

export default function Home() {
  const [allOptimizers, setAllOptimizers] = React.useState<Optimizer[]>([]);
  const [selectedOptimizer, setSelectedOptimizer] = React.useState<Optimizer | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const [user, setUser] = React.useState<FirebaseUser | null>(null);
  const [checkingAuth, setCheckingAuth] = React.useState(true);
  const [selectedOrganizations, setSelectedOrganizations] = React.useState<Optimizer['organization'][]>([]);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [userCompany, setUserCompany] = React.useState<Optimizer['organization'] | null>(null);
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null);
  const [attachmentText, setAttachmentText] = React.useState<string>("");
  const [attachError, setAttachError] = React.useState<string | null>(null);


  React.useEffect(() => {
    if (firestore) {
      getOptimizers(firestore).then(fetchedOptimizers => {
        setAllOptimizers(fetchedOptimizers);
      });
    }
  }, [firestore]);

  // Require auth: check session and redirect to /login if not signed in; also load claims
  React.useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setIsAdmin(false);
        setUserCompany(null);
        setCheckingAuth(false);
        router.replace('/login');
        return;
      }
      if (u) {
        try {
          const t = await getIdTokenResult(u, true);
          const role = (t.claims?.role as string | undefined) || 'member';
          const company = (t.claims?.company as Optimizer['organization'] | undefined) || null;
          setIsAdmin(role === 'admin');
          setUserCompany(company);
          if (role !== 'admin' && company) {
            setSelectedOrganizations([company]);
          }
        } catch {
          setIsAdmin(false);
          setUserCompany(null);
        }
      }
      setCheckingAuth(false);
    });
    return () => unsub();
  }, [auth]);
  
  const filteredOptimizers = React.useMemo(() => {
    const published = allOptimizers.filter(opt => opt.status === 'Published');
    if (selectedOrganizations.length === 0) {
      return published;
    }
    return published.filter(opt => selectedOrganizations.includes(opt.organization));
  }, [allOptimizers, selectedOrganizations]);

  React.useEffect(() => {
    if (filteredOptimizers.length > 0 && !filteredOptimizers.some(opt => opt.id === selectedOptimizer?.id)) {
      setSelectedOptimizer(filteredOptimizers[0]);
    } else if (filteredOptimizers.length === 0) {
      setSelectedOptimizer(null);
    }
  }, [filteredOptimizers, selectedOptimizer]);

  // Subscribe to messages for current user + optimizer
  React.useEffect(() => {
    if (!firestore || !user || !selectedOptimizer) {
      setMessages([]);
      return;
    }
    const msgsRef = collection(
      firestore,
      "users",
      user.uid,
      "optimizerChats",
      selectedOptimizer.id,
      "messages"
    );
    const q = query(msgsRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = snap.docs.map((d) => ({
        role: (d.data().role as Message["role"]) || "assistant",
        content: (d.data().content as string) || "",
      }));
      setMessages(msgs);
    }, (err) => {
      console.error("[Chat] subscribe error", err);
    });
    return () => unsub();
  }, [firestore, user, selectedOptimizer]);

  const optimizersByCategory = React.useMemo(() => {
    return filteredOptimizers.reduce((acc, optimizer) => {
      const { category } = optimizer;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(optimizer);
      return acc;
    }, {} as Record<string, Optimizer[]>);
  }, [filteredOptimizers]);

  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  React.useEffect(() => {
    if (selectedOptimizer) {
      setSelectedCategory(selectedOptimizer.category);
    } else if (Object.keys(optimizersByCategory).length > 0) {
      setSelectedCategory(Object.keys(optimizersByCategory)[0]);
    }
  }, [selectedOptimizer, optimizersByCategory]);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !selectedOptimizer || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const historyLen = selectedOptimizer?.generationParams?.historyMessages ?? 10;
      const idToken = user ? await user.getIdToken() : undefined;
      const res = await fetch("/api/generate-optimized-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          optimizer: selectedOptimizer,
          userInput: input,
          history: messages.slice(-historyLen),
          attachment: attachmentText
            ? {
                name: attachmentFile?.name,
                type: attachmentFile?.type,
                size: attachmentFile?.size,
                text: attachmentText,
              }
            : undefined,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      let optimizedContent = "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (process.env.NODE_ENV !== "production") {
          console.log("[Client] API JSON response", data);
        }
        optimizedContent = data?.optimizedContent || data?.text || data?.content || "";
        if (!res.ok) {
          throw new Error(data?.error || "Generation failed");
        }
      } else {
        const text = await res.text();
        if (process.env.NODE_ENV !== "production") {
          console.log("[Client] API text response", text);
        }
        optimizedContent = text;
        if (!res.ok) {
          throw new Error(text || "Generation failed");
        }
      }

      const assistantMessage: Message = { role: "assistant", content: optimizedContent || "No content generated." };
      setMessages((prev) => [...prev, assistantMessage]);

      // Persist to Firestore if signed-in
      if (firestore && user) {
        const basePath = collection(
          firestore,
          "users",
          user.uid,
          "optimizerChats",
          selectedOptimizer.id,
          "messages"
        );
        // user message
        await addDoc(basePath, {
          role: userMessage.role,
          content: userMessage.content,
          createdAt: serverTimestamp(),
        });
        // assistant message
        await addDoc(basePath, {
          role: assistantMessage.role,
          content: assistantMessage.content,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error generating content:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Clear attachment after send
      setAttachmentFile(null);
      setAttachmentText("");
      setAttachError(null);
    }
  };

  const handleClearChat = async () => {
    if (!firestore || !user || !selectedOptimizer) return;
    try {
      const msgsRef = collection(
        firestore,
        "users",
        user.uid,
        "optimizerChats",
        selectedOptimizer.id,
        "messages"
      );
      const snap = await getDocs(msgsRef);
      if (!snap.empty) {
        const batch = writeBatch(firestore);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      setMessages([]);
    } catch (err) {
      console.error("[Chat] clear failed", err);
    }
  };

  const handleOrganizationChange = (organization: Optimizer['organization'], checked: boolean) => {
    // Members are restricted to their own company
    if (!isAdmin) {
      if (userCompany) setSelectedOrganizations([userCompany]);
      return;
    }
    setSelectedOrganizations(prev => {
      if (checked) {
        return [...prev, organization];
      } else {
        return prev.filter(org => org !== organization);
      }
    });
  };

  return (
    <>
      {checkingAuth ? (
        <div className="flex h-screen items-center justify-center">
          <span className="text-sm text-muted-foreground">Checking session…</span>
        </div>
      ) : !user ? null : (
        <div className="flex flex-col h-screen bg-background">
          <Header />
          <main className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r bg-card hidden md:flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold tracking-tight">Organizations</h2>
            <div className="space-y-2 mt-3">
              {(isAdmin ? ALL_ORGANIZATIONS : ALL_ORGANIZATIONS.filter(o => o === userCompany)).map(org => (
                <div key={org} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`org-${org}`}
                    checked={selectedOrganizations.includes(org)}
                    onCheckedChange={(checked) => handleOrganizationChange(org, !!checked)}
                    disabled={!isAdmin}
                  />
                  <Label htmlFor={`org-${org}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {org}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4">
            <h2 className="text-xl font-semibold tracking-tight">Optimizers</h2>
            <p className="text-sm text-muted-foreground mt-1">Select a profile for your task</p>
          </div>
          <ScrollArea className="flex-1">
            <Accordion type="multiple" defaultValue={Object.keys(optimizersByCategory)} className="w-full px-4">
              {Object.entries(optimizersByCategory).map(([category, optimizers]) => (
                <AccordionItem value={category} key={category}>
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">{category}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
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
                        <CardHeader className="p-3">
                          <CardTitle className="text-sm flex justify-between items-start">
                            {optimizer.name}
                          </CardTitle>
                          <CardDescription className="text-xs line-clamp-2">{optimizer.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </aside>

        <div className="flex-1 flex flex-col">
          <div className="border-b p-4 flex items-center justify-between">
            <div className="md:hidden flex gap-2 w-full">
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-1/2 justify-between">
                    {selectedCategory || "Select Category"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                  {Object.keys(optimizersByCategory).map((category) => (
                    <DropdownMenuItem
                      key={category}
                      onClick={() => {
                        setSelectedCategory(category);
                        const firstOptimizerInCategory = optimizersByCategory[category][0];
                        if (firstOptimizerInCategory) {
                          setSelectedOptimizer(firstOptimizerInCategory);
                        }
                        setMessages([]);
                      }}
                    >
                      {category}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-1/2 justify-between" disabled={!selectedCategory}>
                    {selectedOptimizer ? selectedOptimizer.name : "Select Optimizer"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                  {selectedCategory && optimizersByCategory[selectedCategory]?.map((optimizer) => (
                    <DropdownMenuItem
                      key={optimizer.id}
                      onClick={() => {
                        setSelectedOptimizer(optimizer);
                        setMessages([]);
                      }}
                    >
                      {optimizer.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {selectedOptimizer ? (
              <div className="hidden md:flex items-start justify-between w-full">
                <div>
                  <h3 className="font-semibold text-lg">{selectedOptimizer.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedOptimizer.description}</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearChat}
                      disabled={messages.length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Borrar chat
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Borra todos los mensajes de este chat</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <div className="text-muted-foreground hidden md:block">Select an optimizer to start</div>
            )}
          </div>
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-6">
              {selectedOptimizer && (
                <Card className="bg-muted/40 border-dashed">
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                      {selectedOptimizer.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {selectedOptimizer.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Sparkles className="w-12 h-12 mb-4" />
                  <p>Escribe un mensaje para comenzar</p>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn("flex items-start gap-4", message.role === "user" ? "justify-end" : "")}
                >
                  {message.role === "assistant" && <Avatar Icon={Bot} />}
                  <div
                    className={cn(
                      "rounded-lg px-4 py-3 max-w-xl",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border relative pr-10"
                    )}
                  >
                    <pre className="whitespace-pre-wrap font-body text-sm">{message.content}</pre>
                    {message.role === "assistant" && (
                      <div className="absolute top-2 right-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={async () => {
                                await navigator.clipboard.writeText(message.content);
                                setCopiedIndex(index);
                                setTimeout(() => setCopiedIndex(null), 2000);
                              }}
                            >
                              {copiedIndex === index ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{copiedIndex === index ? "Copiado" : "Copiar"}</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                  {message.role === "user" && <Avatar Icon={User} />}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-4">
                  <Avatar Icon={Bot} />
                  <div className="rounded-lg px-4 py-3 max-w-xl bg-card border flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Generando...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            {/* Attachment preview & picker */}
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-2 min-h-[28px]">
                {attachmentFile && (
                  <div className="flex items-center gap-2 text-sm rounded-md border px-2 py-1 bg-card">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span className="max-w-[220px] truncate">{attachmentFile.name}</span>
                    <button
                      type="button"
                      onClick={() => { setAttachmentFile(null); setAttachmentText(""); setAttachError(null); }}
                      className="inline-flex items-center justify-center rounded hover:bg-muted p-1"
                      aria-label="Remove attachment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {attachError && (
                  <span className="text-xs text-destructive">{attachError}</span>
                )}
              </div>
              <div>
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none px-2 py-1 border rounded-md hover:bg-muted">
                  <Paperclip className="h-3.5 w-3.5" /> Adjuntar
                  <input
                    type="file"
                    className="hidden"
                    accept="text/plain,.txt,.md,.markdown,.json,.csv,.tsv,.html,.htm,.log,.xml,.yml,.yaml"
                    onChange={async (e) => {
                      setAttachError(null);
                      const f = e.target.files?.[0] || null;
                      if (!f) return;
                      const MAX = 5 * 1024 * 1024; // 5MB
                      if (f.size > MAX) {
                        setAttachError('El archivo supera 5MB.');
                        e.currentTarget.value = '';
                        return;
                      }
                      try {
                        // Only process text-like files to ensure the model receives meaningful content
                        const isTextLike = f.type.startsWith('text/') || /\.(txt|md|markdown|json|csv|tsv|html?|log|xml|ya?ml)$/i.test(f.name);
                        if (!isTextLike) {
                          setAttachError('Tipo de archivo no soportado para lectura de texto. Usa TXT, MD, CSV, JSON, HTML, LOG, XML, YAML.');
                          e.currentTarget.value = '';
                          return;
                        }
                        const text = await f.text();
                        setAttachmentFile(f);
                        setAttachmentText(text);
                      } catch (err) {
                        setAttachError('No se pudo leer el archivo.');
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            <form
              onSubmit={handleSendMessage}
              className="relative"
            >
              <Label htmlFor="message" className="sr-only">Message</Label>
              <Textarea
                id="message"
                placeholder={selectedOptimizer ? `Escribe a ${selectedOptimizer.name}... (Shift+Enter para salto de línea)` : "Selecciona un optimizer primero"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const form = (e.currentTarget as HTMLTextAreaElement).form;
                    if (form) form.requestSubmit();
                  }
                }}
                disabled={!selectedOptimizer || isLoading}
                className="pr-16 min-h-[44px]"
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
      )}
    </>
  );
}
