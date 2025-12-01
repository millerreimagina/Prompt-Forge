import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/firebase/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role, company, password } = body || {};

    if (!email || !name || !role || !company) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const app = getFirebaseAdminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Create Auth user (use provided password or default to 'reimagina')
    const finalPassword = password || 'reimagina';
    const disabled = false;
    const userRecord = await auth.createUser({
      email,
      displayName: name,
      password: finalPassword,
      disabled,
    });

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, { role, company });

    // Write Firestore user profile with same UID
    await db.collection('appUsers').doc(userRecord.uid).set({
      name,
      email,
      role,
      company,
      authDisabled: disabled,
      createdAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ id: userRecord.uid });
  } catch (e: any) {
    const msg = e?.message || String(e);
    const code = e?.code;
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Users API][POST] error', e);
    }
    return NextResponse.json({ error: msg, code }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, role, company, disable } = body || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const app = getFirebaseAdminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Update Auth user
    const updateAuth: any = {};
    if (typeof name === 'string') updateAuth.displayName = name;
    if (typeof email === 'string') updateAuth.email = email;
    if (typeof disable === 'boolean') updateAuth.disabled = disable;
    if (Object.keys(updateAuth).length > 0) {
      await auth.updateUser(id, updateAuth);
    }

    // Update claims if role/company provided
    if (role || company) {
      await auth.setCustomUserClaims(id, { role, company });
    }

    // Update Firestore profile
    const updateFs: Record<string, any> = {};
    if (typeof name === 'string') updateFs.name = name;
    if (typeof email === 'string') updateFs.email = email;
    if (typeof role === 'string') updateFs.role = role;
    if (typeof company === 'string') updateFs.company = company;
    if (typeof disable === 'boolean') updateFs.authDisabled = disable;
    if (Object.keys(updateFs).length > 0) {
      await db.collection('appUsers').doc(id).set(updateFs, { merge: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || String(e);
    const code = e?.code;
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Users API][PUT] error', e);
    }
    return NextResponse.json({ error: msg, code }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    if (ids.length === 0) return NextResponse.json({ error: 'No ids provided' }, { status: 400 });

    const app = getFirebaseAdminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Delete Auth users (batch delete is limited; iterate)
    await Promise.all(ids.map(async (uid) => {
      try { await auth.deleteUser(uid); } catch {}
      await db.collection('appUsers').doc(uid).delete();
    }));

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || String(e);
    const code = e?.code;
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Users API][DELETE] error', e);
    }
    return NextResponse.json({ error: msg, code }, { status: 500 });
  }
}
