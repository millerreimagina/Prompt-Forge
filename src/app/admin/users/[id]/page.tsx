"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { AppUser, getUser } from '@/lib/users-service';
import { UserForm } from '@/components/admin/user-form';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';

export default function UserPage() {
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
  const [user, setUser] = useState<AppUser | null | undefined>(undefined);

  useEffect(() => {
    if (!firestore || !id) return;
    if (id === 'new') {
      setUser({ id: '', name: '', email: '', role: 'member', company: 'Reimagina' });
    } else {
      getUser(firestore, id).then(setUser);
    }
  }, [firestore, id]);

  if (checking) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Skeleton className="h-10 w-1/2 mb-2" />
        <Skeleton className="h-4 w-1/4 mb-4" />
      </div>
    );
  }

  if (!isAdmin) return null;

  if (user === undefined) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Skeleton className="h-10 w-1/2 mb-2" />
        <Skeleton className="h-4 w-1/4 mb-4" />
        <Skeleton className="w-full h-[400px]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{id === 'new' ? 'Create User' : 'Edit User'}</h1>
      </div>
      {user && <UserForm user={user} />}
    </div>
  );
}
