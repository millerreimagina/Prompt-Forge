import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/firebase/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const app = getFirebaseAdminApp();
    const adminAuth = getAuth(app);

    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
      // If exists, update password to ensure credentials match
      await adminAuth.updateUser(userRecord.uid, { password });
    } catch (e: any) {
      if (e?.code === 'auth/user-not-found' || e?.errorInfo?.code === 'auth/user-not-found') {
        userRecord = await adminAuth.createUser({ email, password, emailVerified: true, disabled: false });
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[seed-user] get/create error', e);
        }
        return NextResponse.json({ error: e?.message || 'Admin error' }, { status: 500 });
      }
    }

    return NextResponse.json({ uid: userRecord.uid, email: userRecord.email });
  } catch (error: any) {
    console.error('[seed-user] error', error);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
}
