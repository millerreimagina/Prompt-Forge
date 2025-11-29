"use client";
import * as React from "react";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [signedEmail, setSignedEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setSignedEmail(u?.email ?? null));
    return () => unsub();
  }, [auth]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onSeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dev/seed-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Seed failed');
      // Autofill signed email hint
      setSignedEmail(data?.email || email);
    } catch (e: any) {
      setError(e?.message || 'Seed failed');
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  return (
    <div className="container mx-auto max-w-md py-8 px-4 md:px-6">
      <Card>
        <CardHeader>
          <CardTitle>{signedEmail ? "Your Account" : "Sign in"}</CardTitle>
        </CardHeader>
        <CardContent>
          {signedEmail ? (
            <div className="space-y-4">
              <p className="text-sm">Signed in as {signedEmail}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push("/")}>Go to App</Button>
                <Button variant="destructive" onClick={onLogout}>Sign out</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
                <Button type="button" variant="outline" onClick={() => router.push("/")}>Cancel</Button>
                {process.env.NODE_ENV !== 'production' && (
                  <Button type="button" variant="secondary" onClick={onSeed} disabled={loading}>
                    {loading ? 'Seeding...' : 'Seed user (dev)'}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">For dev: you can seed the user if it doesn't exist.</p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
