// This file is for server-side functions that should not be exposed to the client.
import 'server-only';
import type { Firestore } from 'firebase-admin/firestore';
import type { Optimizer } from './types';


export async function getOptimizer(
  db: Firestore,
  id: string
): Promise<Optimizer | null> {
  if (!id) return null;
  const docRef = db.collection('optimizers').doc(id);
  const snapshot = await docRef.get();
  
  if (snapshot.exists) {
    return { ...snapshot.data(), id: snapshot.id } as Optimizer;
  }
  return null;
}
