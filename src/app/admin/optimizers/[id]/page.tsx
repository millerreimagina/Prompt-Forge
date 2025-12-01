"use client";
import { useEffect, useState } from 'react';
import { OptimizerForm } from "@/components/admin/optimizer-form";
import { notFound, useParams } from "next/navigation";
import { useFirestore } from '@/firebase';
import { getOptimizer } from '@/lib/optimizers-service';
import { Optimizer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';

export default function OptimizerPage() {
  const auth = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setIsAdmin(false);
        setChecking(false);
        router.replace('/');
        return;
      }
      try {
        const token = await getIdTokenResult(u, true);
        const admin = token.claims?.role === 'admin';
        setIsAdmin(admin);
        if (!admin) router.replace('/');
      } finally {
        setChecking(false);
      }
    });
    return () => unsub();
  }, [auth, router]);

  const { id } = useParams() as { id: string };
  const firestore = useFirestore();
  const [optimizer, setOptimizer] = useState<Optimizer | null | undefined>(undefined);

  useEffect(() => {
    if (firestore && id) {
      if (id === 'new') {
        setOptimizer({
          id: '',
          internalName: 'New Optimizer',
          name: 'New Optimizer',
          description: '',
          language: 'English',
          status: 'Draft',
          category: 'Social Media',
          organization: 'Personal',
          model: {
            provider: 'OpenAI',
            model: 'gpt-4o',
            temperature: 1,
            maxTokens: 1024,
            topP: 1,
          },
          systemPrompt: '',
          knowledgeBase: [],
          generationParams: {
            variants: 1,
            preferredLength: 'Medium',
            creativityLevel: 'Balanced',
            structureRules: [],
            explainReasoning: false,
          },
          guidedInputs: [],
        });
      } else {
        getOptimizer(firestore, id).then(setOptimizer);
      }
    }
  }, [firestore, id]);

  if (checking) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <p className="text-sm text-muted-foreground">Checking permissions…</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  if (optimizer === undefined) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="mb-8">
            <Skeleton className="h-10 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/4" />
        </div>
        <Skeleton className="w-full h-[600px]" />
      </div>
    );
  }

  if (optimizer === null) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {id === 'new' ? 'Create New Optimizer' : 'Configure Optimizer'}
        </h1>
        <p className="text-muted-foreground">
            {id !== 'new' && `Editing "${optimizer.name}"`}
        </p>
      </div>
      <OptimizerForm optimizer={optimizer} />
    </div>
  );
}
