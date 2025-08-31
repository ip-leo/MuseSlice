import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { outputSessionId, count } = await request.json();
    if (!outputSessionId) {
      return NextResponse.json({ error: 'Missing outputSessionId' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const existing = await prisma.audioFile.findFirst({
      where: { userId: user.id, outputSessionId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
    }

    const incrementBy = Number.isFinite(count) && Number(count) > 0 ? Math.floor(Number(count)) : 1;
    const updated = await prisma.audioFile.update({
      where: { id: existing.id },
      data: {
        downloadCount: { increment: incrementBy },
        lastDownloadedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, downloadCount: updated.downloadCount });
  } catch (error) {
    console.error('Error incrementing download count:', error);
    return NextResponse.json({ error: 'Failed to update download count' }, { status: 500 });
  }
}
