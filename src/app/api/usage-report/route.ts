import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/firebase/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

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

    let isAdmin = false;
    try {
      const token = await auth.verifyIdToken(idToken, true);
      const role = (token as any).role || (token as any).claims?.role;
      isAdmin = role === 'admin';
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startStr = searchParams.get('start');
    const endStr = searchParams.get('end');

    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);

    const startDate = parseDateParam(startStr) || defaultStart;
    const endDate = parseDateParam(endStr) || now;

    const startTs = Timestamp.fromDate(startDate);
    const endTs = Timestamp.fromDate(endDate);

    const logsSnap = await db
      .collection('usageLogs')
      .where('createdAt', '>=', startTs)
      .where('createdAt', '<=', endTs)
      .get();

    const byUser = new Map<string, { totalTokens: number; totalRequests: number }>();
    const byOptimizer = new Map<string, { totalTokens: number; totalRequests: number }>();

    logsSnap.forEach((doc) => {
      const d = doc.data() as any;
      const uid: string = d.uid;
      const optimizerId: string = d.optimizerId || 'unknown';
      const tokens: number = typeof d.tokens === 'number' ? d.tokens : 0;
      const requests: number = typeof d.requests === 'number' ? d.requests : 0;

      const u = byUser.get(uid) || { totalTokens: 0, totalRequests: 0 };
      u.totalTokens += tokens;
      u.totalRequests += requests;
      byUser.set(uid, u);

      const o = byOptimizer.get(optimizerId) || { totalTokens: 0, totalRequests: 0 };
      o.totalTokens += tokens;
      o.totalRequests += requests;
      byOptimizer.set(optimizerId, o);
    });

    // Enrich user info
    const appUsersSnap = await db.collection('appUsers').get();
    const usersMap = new Map<string, any>();
    appUsersSnap.forEach((d) => usersMap.set(d.id, d.data()));

    const ranking = Array.from(byUser.entries())
      .map(([uid, v]) => ({ id: uid, ...(usersMap.get(uid) || {}), totalTokens: v.totalTokens, totalRequests: v.totalRequests }))
      .sort((a, b) => b.totalTokens - a.totalTokens);

    // Enrich optimizer names
    const optimizersSnap = await db.collection('optimizers').get();
    const optimMap = new Map<string, any>();
    optimizersSnap.forEach((d) => optimMap.set(d.id, d.data()));

    const optimizers = Array.from(byOptimizer.entries())
      .map(([optimizerId, v]) => ({ id: optimizerId, name: optimMap.get(optimizerId)?.name || optimizerId, totalTokens: v.totalTokens, totalRequests: v.totalRequests }))
      .sort((a, b) => b.totalTokens - a.totalTokens);

    return NextResponse.json({ ranking, optimizers, start: startDate.toISOString(), end: endDate.toISOString() });
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Usage Report] error', e);
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
