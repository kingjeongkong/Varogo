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
          openingPatterns: ['Starts with a noun phrase. Posts: #1, #2, #3'],
          signaturePhrases: ['you can feel it', 'which, fine.'],
        }),
      });

      const result = await service.analyze(sampleUnits);

      expect(result.source).toBe('threads_import');
      expect(result.sampleCount).toBe(2);
      expect(result.styleFingerprint.tonality).toContain('deadpan');
      expect(result.styleFingerprint.openingPatterns).toHaveLength(1);
      expect(result.styleFingerprint.signaturePhrases).toEqual([
        'you can feel it',
        'which, fine.',
      ]);
      expect(result.referenceSamples).toHaveLength(2);
      expect(result.referenceSamples[0].text).toBe('first post text');
      expect(result.referenceSamples[0].date).toBe('2026-04-19T12:00:00Z');
    });

    it('limits referenceSamples to 5 even when more units provided', async () => {
      const many = Array.from({ length: 10 }, (_, i) =>
        unit(String(i), `post ${i}`),
      );
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          tonality: 't',
          openingPatterns: [],
          signaturePhrases: [],
        }),
      });

      const result = await service.analyze(many);

      expect(result.referenceSamples).toHaveLength(5);
    });

    it('uses gemini-2.5-flash-lite with structured JSON output config', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          tonality: 't',
          openingPatterns: [],
          signaturePhrases: [],
        }),
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

    it('throws InternalServerErrorException when Gemini returns empty text', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: '' });

      await expect(service.analyze(sampleUnits)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws InternalServerErrorException when Gemini returns JSON missing required fields', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ tonality: 'only this field' }),
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
