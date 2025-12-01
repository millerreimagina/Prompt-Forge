import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    let body: any = {};
    try { body = JSON.parse(raw || '{}'); } catch {}
    const userId: string | undefined = body?.userId;
    const optimizerId: string | undefined = body?.optimizerId;

    if (!userId || !optimizerId) {
      return NextResponse.json({ error: 'Missing userId or optimizerId' }, { status: 400 });
    }

    const { getFirebaseAdminApp } = await import('@/firebase/firebase-admin');
    const admin = getFirebaseAdminApp();
    const db = getFirestore(admin);

    const colRef = db
      .collection('users')
      .doc(userId)
      .collection('optimizerChats')
      .doc(optimizerId)
      .collection('messages');

    const snap = await colRef.get();
    const batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return NextResponse.json({ ok: true, deleted: snap.size });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[API] clear-chat error', error);
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
