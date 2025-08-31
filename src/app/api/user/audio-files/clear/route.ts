import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const serviceUrl = process.env.NEXT_PUBLIC_AUDIO_SERVICE_URL || 'http://localhost:5002';
    try {
      const files = await prisma.audioFile.findMany({
        where: { userId: user.id },
        select: { sessionId: true, outputSessionId: true },
      });
      const uniqueIds = new Set<string>();
      for (const f of files) {
        if (f.sessionId) uniqueIds.add(f.sessionId);
        if (f.outputSessionId) uniqueIds.add(f.outputSessionId);
      }
      await Promise.all(
        Array.from(uniqueIds).map(async (id) => {
          try {
            await fetch(`${serviceUrl}/cleanup/${id}`, { method: 'DELETE', cache: 'no-store' });
          } catch {}
        })
      );
    } catch {}

    const result = await prisma.audioFile.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ success: true, deleted: result.count });

  } catch (error) {
    console.error('Error clearing audio history:', error);
    return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

