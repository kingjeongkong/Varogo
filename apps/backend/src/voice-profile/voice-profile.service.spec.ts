import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ThreadsService } from '../threads/threads.service';
import type { ThreadsVoiceUnit } from '../threads/types/threads-voice-unit.type';
import type { VoiceAnalysisResult } from './types/style-fingerprint.type';
import { VoiceAnalysisService } from './voice-analysis.service';
import { VoiceProfileService } from './voice-profile.service';

const mockPrisma = {
  voiceProfile: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockThreadsService = {
  getUserVoiceUnits: jest.fn(),
};

const mockVoiceAnalysisService = {
  analyze: jest.fn(),
};

function unit(id: string): ThreadsVoiceUnit {
  return {
    id,
    text: `text ${id}`,
    timestamp: '2026-04-19T12:00:00Z',
    permalink: null,
    partCount: 1,
  };
}

const VALID_ANALYSIS: VoiceAnalysisResult = {
  source: 'threads_import',
  sampleCount: 5,
  styleFingerprint: {
    tonality: 'deadpan single-liners',
    avgLength: 80,
    openingPatterns: ['Starts with a question'],
    emojiDensity: 0.5,
    hashtagUsage: 0.2,
  },
  referenceSamples: [{ text: 'sample 1', date: '2026-04-19T12:00:00Z' }],
};

describe('VoiceProfileService', () => {
  let service: VoiceProfileService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        VoiceProfileService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ThreadsService, useValue: mockThreadsService },
        { provide: VoiceAnalysisService, useValue: mockVoiceAnalysisService },
      ],
    }).compile();

    service = module.get(VoiceProfileService);
    jest.clearAllMocks();
  });

  describe('importFromThreads', () => {
    const userId = 'user-1';

    it('upserts voice profile with analysis result', async () => {
      const units = Array.from({ length: 5 }, (_, i) => unit(String(i)));
      mockThreadsService.getUserVoiceUnits.mockResolvedValue(units);
      mockVoiceAnalysisService.analyze.mockResolvedValue(VALID_ANALYSIS);
      mockPrisma.voiceProfile.upsert.mockResolvedValue({
        id: 'profile-1',
        userId,
      });

      await service.importFromThreads(userId);

      expect(mockThreadsService.getUserVoiceUnits).toHaveBeenCalledWith(userId);
      expect(mockVoiceAnalysisService.analyze).toHaveBeenCalledWith(units);
      expect(mockPrisma.voiceProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          create: expect.objectContaining({
            userId,
            source: 'threads_import',
            sampleCount: 5,
          }) as Record<string, unknown>,
          update: expect.objectContaining({
            source: 'threads_import',
            sampleCount: 5,
          }) as Record<string, unknown>,
        }),
      );
    });

    it('throws BadRequestException when fewer than 5 voice units', async () => {
      mockThreadsService.getUserVoiceUnits.mockResolvedValue([
        unit('1'),
        unit('2'),
      ]);

      await expect(service.importFromThreads(userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockVoiceAnalysisService.analyze).not.toHaveBeenCalled();
      expect(mockPrisma.voiceProfile.upsert).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns voice profile when found', async () => {
      const profile = { id: 'p1', userId: 'user-1' };
      mockPrisma.voiceProfile.findUnique.mockResolvedValue(profile);

      const result = await service.findOne('user-1');

      expect(result).toEqual(profile);
      expect(mockPrisma.voiceProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('returns null when not found', async () => {
      mockPrisma.voiceProfile.findUnique.mockResolvedValue(null);

      const result = await service.findOne('user-1');

      expect(result).toBeNull();
    });
  });
});
