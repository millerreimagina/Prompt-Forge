"use client";

import * as React from "react";
import { useAuth } from "@/firebase";
import { onAuthStateChanged, getIdTokenResult, type User as FirebaseUser } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";

type UsageRow = {
  id: string;
  name?: string;
  email?: string;
  company?: string;
  role?: string;
  avatarUrl?: string;
  totalTokens: number;
  totalRequests: number;
};

type OptimizerUsage = {
  id: string;
  name: string;
  totalTokens: number;
  totalRequests: number;
};

export default function SettingsPage() {
  const auth = useAuth();
  const router = useRouter();
  const [checking, setChecking] = React.useState(true);
  const [user, setUser] = React.useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [ranking, setRanking] = React.useState<UsageRow[]>([]);
  const [optimizers, setOptimizers] = React.useState<OptimizerUsage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [start, setStart] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [end, setEnd] = React.useState<string>(() => new Date().toISOString().slice(0, 10));

  const fetchReport = React.useCallback(async (u: FirebaseUser) => {
    setLoading(true);
    try {
      const idt = await u.getIdToken();
      const params = new URLSearchParams({ start, end });
      const res = await fetch(`/api/usage-report?${params.toString()}`, {
        headers: { Authorization: `Bearer ${idt}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load usage report');
      setRanking(Array.isArray(data?.ranking) ? data.ranking : []);
      setOptimizers(Array.isArray(data?.optimizers) ? data.optimizers : []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  React.useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setIsAdmin(false);
        setChecking(false);
        router.replace('/login');
        return;
      }
      try {
        const token = await getIdTokenResult(u, true);
        const role = (token.claims?.role as string | undefined) || 'member';
        const isAdm = role === 'admin';
        setIsAdmin(isAdm);
        setChecking(false);
        if (!isAdm) {
          router.replace('/');
          return;
        }
        await fetchReport(u);
      } catch (e: any) {
        setError(e?.message || 'Error');
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [auth, router, fetchReport]);

  if (checking) {
    return <div className="flex h-screen items-center justify-center"><span className="text-sm text-muted-foreground">Checking session…</span></div>;
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      <main className="flex-1 p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Inicio</div>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Fin</div>
                <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
              <Button
                onClick={() => {
                  if (user) fetchReport(user);
                }}
              >
                Aplicar
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Uso de Tokens por Usuario</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Cargando…</div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : ranking.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin datos.</div>
            ) : (
              <ScrollArea className="max-h-[40vh]">
                <div className="grid grid-cols-12 gap-2 text-sm font-medium border-b pb-2">
                  <div className="col-span-4">Usuario</div>
                  <div className="col-span-3">Email</div>
                  <div className="col-span-2">Compañía</div>
                  <div className="col-span-1 text-right">Reqs</div>
                  <div className="col-span-2 text-right">Tokens</div>
                </div>
                {ranking.map((r) => (
                  <div key={r.id} className="grid grid-cols-12 gap-2 py-2 border-b text-sm">
                    <div className="col-span-4 truncate">{r.name || r.id}</div>
                    <div className="col-span-3 truncate">{r.email || '-'}</div>
                    <div className="col-span-2 truncate">{r.company || '-'}</div>
                    <div className="col-span-1 text-right">{r.totalRequests ?? 0}</div>
                    <div className="col-span-2 text-right">{r.totalTokens ?? 0}</div>
                  </div>
                ))}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Métricas por Optimizer</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Cargando…</div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : optimizers.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin datos.</div>
            ) : (
              <ScrollArea className="max-h-[40vh]">
                <div className="grid grid-cols-12 gap-2 text-sm font-medium border-b pb-2">
                  <div className="col-span-7">Optimizer</div>
                  <div className="col-span-2 text-right">Reqs</div>
                  <div className="col-span-3 text-right">Tokens</div>
                </div>
                {optimizers.map((o) => (
                  <div key={o.id} className="grid grid-cols-12 gap-2 py-2 border-b text-sm">
                    <div className="col-span-7 truncate">{o.name}</div>
                    <div className="col-span-2 text-right">{o.totalRequests ?? 0}</div>
                    <div className="col-span-3 text-right">{o.totalTokens ?? 0}</div>
                  </div>
                ))}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
