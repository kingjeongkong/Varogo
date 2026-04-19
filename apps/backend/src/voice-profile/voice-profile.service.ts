import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ThreadsService } from '../threads/threads.service';
import { VoiceAnalysisService } from './voice-analysis.service';

const MIN_VOICE_UNITS = 5;

@Injectable()
export class VoiceProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly threadsService: ThreadsService,
    private readonly voiceAnalysisService: VoiceAnalysisService,
  ) {}

  async importFromThreads(userId: string) {
    const units = await this.threadsService.getUserVoiceUnits(userId);

    if (units.length < MIN_VOICE_UNITS) {
      throw new BadRequestException(
        `Need at least ${MIN_VOICE_UNITS} Threads posts to import voice (found ${units.length}).`,
      );
    }

    const result = await this.voiceAnalysisService.analyze(units);

    return this.prisma.voiceProfile.upsert({
      where: { userId },
      create: {
        userId,
        source: result.source,
        sampleCount: result.sampleCount,
        styleFingerprint:
          result.styleFingerprint as unknown as Prisma.InputJsonValue,
        referenceSamples:
          result.referenceSamples as unknown as Prisma.InputJsonValue,
      },
      update: {
        source: result.source,
        sampleCount: result.sampleCount,
        styleFingerprint:
          result.styleFingerprint as unknown as Prisma.InputJsonValue,
        referenceSamples:
          result.referenceSamples as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async findOne(userId: string) {
    return this.prisma.voiceProfile.findUnique({
      where: { userId },
    });
  }
}
