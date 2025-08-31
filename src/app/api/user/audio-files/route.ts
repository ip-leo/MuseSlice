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

    const body = await request.json();
    const {
      originalFileName,
      originalFileSize,
      originalFileType,
      sessionId,
      detectedInstruments,
      selectedInstruments,
      separatedTracks,
      audioMetadata,
      processingStatus = 'completed',
      fileExpiresAt, 
      filesAvailable 
    } = body;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let audioFile;
    const existing = sessionId ? await prisma.audioFile.findFirst({
      where: { userId: user.id, sessionId },
    }) : null;

    const dataToWrite: any = {
      userId: user.id,
      originalFileName,
      originalFileSize,
      originalFileType,
      sessionId,
      processingStatus,
      processingCompletedAt: processingStatus === 'completed' ? new Date() : undefined,
      filesAvailable: filesAvailable ?? true,
      fileExpiresAt: fileExpiresAt ? new Date(fileExpiresAt) : undefined,
    };

    if (detectedInstruments !== undefined) dataToWrite.detectedInstruments = JSON.stringify(detectedInstruments);
    if (selectedInstruments !== undefined) dataToWrite.selectedInstruments = JSON.stringify(selectedInstruments);
    if (separatedTracks !== undefined) dataToWrite.separatedTracks = JSON.stringify(separatedTracks);
    if (audioMetadata !== undefined) dataToWrite.audioMetadata = JSON.stringify(audioMetadata);
    if (body.outputSessionId) dataToWrite.outputSessionId = body.outputSessionId;

    if (existing) {
      audioFile = await prisma.audioFile.update({
        where: { id: existing.id },
        data: dataToWrite,
      });
    } else {
      audioFile = await prisma.audioFile.create({
        data: dataToWrite,
      });
    }

    return NextResponse.json({ 
      success: true, 
      audioFileId: audioFile.id 
    });

  } catch (error) {
    console.error('Error saving audio file:', error);
    return NextResponse.json(
      { error: 'Failed to save audio file' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const audioFiles = await prisma.audioFile.findMany({
      where: { userId: user.id },
      orderBy: { uploadedAt: 'desc' }
    });

    const processedAudioFiles = audioFiles.map(file => ({
      ...file,
      detectedInstruments: file.detectedInstruments ? JSON.parse(file.detectedInstruments) : null,
      selectedInstruments: file.selectedInstruments ? JSON.parse(file.selectedInstruments) : null,
      separatedTracks: file.separatedTracks ? JSON.parse(file.separatedTracks) : null,
      audioMetadata: file.audioMetadata ? JSON.parse(file.audioMetadata) : null
    }));

    return NextResponse.json({ audioFiles: processedAudioFiles });

  } catch (error) {
    console.error('Error fetching audio files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audio files' }, 
      { status: 500 }
    );
  }
} 
