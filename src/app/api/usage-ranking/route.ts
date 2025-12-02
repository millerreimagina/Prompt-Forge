import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/firebase/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice('Bearer '.length).trim();
    const app = getFirebaseAdminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    let uid = '';
    let isAdmin = false;
    try {
      const token = await auth.verifyIdToken(idToken, true);
      uid = token.uid;
      isAdmin = (token.role as string) === 'admin' || token.role === 'admin' || token.claims?.role === 'admin' || (token as any)['role'] === 'admin';
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch users from appUsers and their usage doc from users/{uid}/metrics/usage
    const appUsersSnap = await db.collection('appUsers').get();

    const results: Array<{ id: string; name?: string; email?: string; company?: string; role?: string; avatarUrl?: string; totalTokens: number; totalRequests: number }> = [];

    for (const doc of appUsersSnap.docs) {
      const data = doc.data() as any;
      const usageRef = db.doc(`users/${doc.id}/metrics/usage`);
      const usageSnap = await usageRef.get();
      const usage = usageSnap.exists ? (usageSnap.data() as any) : {};
      results.push({
        id: doc.id,
        name: data.name,
        email: data.email,
        company: data.company,
        role: data.role,
        avatarUrl: data.avatarUrl,
        totalTokens: typeof usage.totalTokens === 'number' ? usage.totalTokens : 0,
        totalRequests: typeof usage.totalRequests === 'number' ? usage.totalRequests : 0,
      });
    }

    results.sort((a, b) => (b.totalTokens || 0) - (a.totalTokens || 0));

    return NextResponse.json({ ranking: results });
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Usage Ranking] error', e);
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
