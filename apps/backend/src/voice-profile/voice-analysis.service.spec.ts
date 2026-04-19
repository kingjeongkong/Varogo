import { InternalServerErrorException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GeminiService } from '../llm/gemini.service';
import type { ThreadsVoiceUnit } from '../threads/types/threads-voice-unit.type';
import { VoiceAnalysisService } from './voice-analysis.service';

const mockGenerateContent = jest.fn();

const mockGeminiService = {
  getClient: jest.fn().mockReturnValue({
    models: { generateContent: mockGenerateContent },
  }),
};

function unit(
  id: string,
  text: string,
  timestamp = '2026-04-19T12:00:00Z',
): ThreadsVoiceUnit {
  return { id, text, timestamp, permalink: null, partCount: 1 };
}

describe('VoiceAnalysisService', () => {
  let service: VoiceAnalysisService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        VoiceAnalysisService,
        { provide: GeminiService, useValue: mockGeminiService },
      ],
    }).compile();

    service = module.get(VoiceAnalysisService);
    jest.clearAllMocks();

    mockGeminiService.getClient.mockReturnValue({
      models: { generateContent: mockGenerateContent },
    });
  });

  describe('computeStats', () => {
    it('computes avgLength as rounded mean of unit text lengths', () => {
      const stats = service.computeStats([
        unit('1', 'a'.repeat(100)),
        unit('2', 'b'.repeat(200)),
      ]);
      expect(stats.avgLength).toBe(150);
    });

    it('computes emojiDensity as percentage of emoji code points over string length (2 decimals)', () => {
      const stats = service.computeStats([unit('1', 'hello 🚀 world 🎉')]);
      // 2 emojis / 17 string-length chars * 100 = 11.7647... → 11.76
      expect(stats.emojiDensity).toBe(11.76);
    });

    it('returns 0 emojiDensity when texts are all empty', () => {
      const stats = service.computeStats([unit('1', ''), unit('2', '')]);
      expect(stats.emojiDensity).toBe(0);
    });

    it('computes hashtagUsage as average hashtags per unit (2 decimals)', () => {
      const stats = service.computeStats([
        unit('1', 'one #tag here'),
        unit('2', 'three #tags #here #now'),
      ]);
      // (1 + 3) / 2 = 2.0
      expect(stats.hashtagUsage).toBe(2);
    });

    it('matches Korean hashtags', () => {
      const stats = service.computeStats([
        unit('1', '안녕 #한글태그 만나서 #반가워'),
      ]);
      expect(stats.hashtagUsage).toBe(2);
    });
  });

  describe('analyze', () => {
    const sampleUnits: ThreadsVoiceUnit[] = [
      unit('1', 'first post text', '2026-04-19T12:00:00Z'),
      unit('2', 'second post text', '2026-04-18T12:00:00Z'),
    ];

    it('combines deterministic stats with LLM qualitative output', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          tonality:
            'opens with deadpan single-line observations (e.g., post #1)',
          openingPatterns: ['Starts with a noun phrase (e.g., post #1, #2)'],
        }),
      });

      const result = await service.analyze(sampleUnits);

      expect(result.source).toBe('threads_import');
      expect(result.sampleCount).toBe(2);
      expect(result.styleFingerprint.tonality).toContain('deadpan');
      expect(result.styleFingerprint.openingPatterns).toHaveLength(1);
      expect(result.styleFingerprint.avgLength).toBeGreaterThan(0);
      expect(result.referenceSamples).toHaveLength(2);
      expect(result.referenceSamples[0].text).toBe('first post text');
      expect(result.referenceSamples[0].date).toBe('2026-04-19T12:00:00Z');
    });

    it('limits referenceSamples to 5 even when more units provided', async () => {
      const many = Array.from({ length: 10 }, (_, i) =>
        unit(String(i), `post ${i}`),
      );
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ tonality: 't', openingPatterns: [] }),
      });

      const result = await service.analyze(many);

      expect(result.referenceSamples).toHaveLength(5);
    });

    it('uses gemini-2.5-flash-lite with structured JSON output config', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ tonality: 't', openingPatterns: [] }),
      });

      await service.analyze(sampleUnits);

      const calls = mockGenerateContent.mock.calls as Array<
        [{ model: string; config: Record<string, unknown> }]
      >;
      expect(calls[0][0].model).toBe('gemini-2.5-flash-lite');
      expect(calls[0][0].config).toEqual(
        expect.objectContaining({ responseMimeType: 'application/json' }),
      );
    });

    it('throws InternalServerErrorException on invalid JSON from Gemini', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'not valid json {{{',
      });

      await expect(service.analyze(sampleUnits)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws InternalServerErrorException when Gemini call rejects', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('API timeout'));

      await expect(service.analyze(sampleUnits)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
