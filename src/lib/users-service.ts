import { Firestore, collection, doc, getDoc, getDocs } from 'firebase/firestore';

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'admin';
  company: 'Reimagina' | 'Trend Riders';
};

export async function getUsers(db: Firestore): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, 'appUsers'));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<AppUser,'id'>) }));
}

export async function getUser(db: Firestore, id: string): Promise<AppUser | null> {
  if (!id) return null;
  const ref = doc(db, 'appUsers', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<AppUser,'id'>) };
}

export async function saveUser(db: Firestore, user: AppUser): Promise<string> {
  const { id, ...payload } = user;
  if (!id) {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error((data as any)?.error || (typeof data === 'string' ? data : 'Create user failed'));
    return data.id as string;
  } else {
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    });
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error((data as any)?.error || (typeof data === 'string' ? data : 'Update user failed'));
    return id;
  }
}

export async function deleteUsers(_db: Firestore, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const res = await fetch('/api/users', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data as any)?.error || (typeof data === 'string' ? data : 'Delete users failed'));
}
