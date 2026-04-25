import { InternalServerErrorException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GeminiService } from '../llm/gemini.service';
import type {
  ReferenceSample,
  StyleFingerprint,
} from '../voice-profile/types/style-fingerprint.type';
import type { GeneratedHook } from './types/hook-generation.type';
import type { VoiceEvaluationInput } from './types/voice-evaluation.type';
import { VoiceEvaluatorService } from './voice-evaluator.service';

interface GenerateContentCall {
  model: string;
  contents: string;
  config: { responseMimeType: string; responseSchema: unknown };
}

const mockGenerateContent = jest.fn();

const mockGeminiService = {
  getClient: jest.fn().mockReturnValue({
    models: { generateContent: mockGenerateContent },
  }),
};

function nthGeminiCall(n: number): GenerateContentCall {
  const calls = mockGenerateContent.mock
    .calls as unknown as GenerateContentCall[][];
  return calls[n][0];
}

const FINGERPRINT: StyleFingerprint = {
  tonality: 'Short declarative sentences punctuated with periods.',
  avgLength: 240,
  openingPatterns: ['Imperative sentence. Posts: #1, #4'],
  signaturePhrases: ['you need to'],
  emojiDensity: 0,
  hashtagUsage: 0,
};

const SAMPLES: ReferenceSample[] = [
  {
    text: 'You need to read more, and you need to consume less.',
    date: '2026-04-01',
  },
  { text: 'Front-load your decision-making.', date: '2026-04-02' },
];

const HOOKS: GeneratedHook[] = [
  {
    text: 'You need to ship daily. Even when nobody reads it.',
    angleLabel: 'Imperative',
  },
  {
    text: "Three months ago, I wasn't sure this would work.",
    angleLabel: 'Story',
  },
  {
    text: "Most people think marketing is hard. It isn't!",
    angleLabel: 'Contrarian',
  },
];

function makeInput(): VoiceEvaluationInput {
  return {
    hooks: HOOKS,
    styleFingerprint: FINGERPRINT,
    referenceSamples: SAMPLES,
    todayInput: null,
  };
}

describe('VoiceEvaluatorService', () => {
  let service: VoiceEvaluatorService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        VoiceEvaluatorService,
        { provide: GeminiService, useValue: mockGeminiService },
      ],
    }).compile();

    service = module.get(VoiceEvaluatorService);
    jest.clearAllMocks();

    mockGeminiService.getClient.mockReturnValue({
      models: { generateContent: mockGenerateContent },
    });
  });

  describe('evaluate', () => {
    it('returns allMatched=true when every hook is reported matched', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          perHookFeedback: [
            { hookIndex: 0, matched: true, mismatches: [] },
            { hookIndex: 1, matched: true, mismatches: [] },
            { hookIndex: 2, matched: true, mismatches: [] },
          ],
        }),
      });

      const result = await service.evaluate(makeInput());

      expect(result.allMatched).toBe(true);
      expect(result.perHookFeedback).toHaveLength(3);
      expect(result.perHookFeedback[0].mismatches).toEqual([]);
    });

    it('returns allMatched=false and surfaces mismatches when at least one hook fails', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          perHookFeedback: [
            { hookIndex: 0, matched: true, mismatches: [] },
            { hookIndex: 1, matched: true, mismatches: [] },
            {
              hookIndex: 2,
              matched: false,
              mismatches: ['uses exclamation mark; reference posts have zero'],
            },
          ],
        }),
      });

      const result = await service.evaluate(makeInput());

      expect(result.allMatched).toBe(false);
      expect(result.perHookFeedback[2].matched).toBe(false);
      expect(result.perHookFeedback[2].mismatches).toEqual([
        'uses exclamation mark; reference posts have zero',
      ]);
    });

    it('returns allMatched=false when every hook is mismatched', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          perHookFeedback: [
            { hookIndex: 0, matched: false, mismatches: ['too long'] },
            { hookIndex: 1, matched: false, mismatches: ['cliche opener'] },
            { hookIndex: 2, matched: false, mismatches: ['exclamation mark'] },
          ],
        }),
      });

      const result = await service.evaluate(makeInput());

      expect(result.allMatched).toBe(false);
      expect(result.perHookFeedback.every((e) => !e.matched)).toBe(true);
    });

    it('passes the response schema and prompt with reference samples to Gemini', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          perHookFeedback: [
            { hookIndex: 0, matched: true, mismatches: [] },
            { hookIndex: 1, matched: true, mismatches: [] },
            { hookIndex: 2, matched: true, mismatches: [] },
          ],
        }),
      });

      await service.evaluate(makeInput());

      const call = nthGeminiCall(0);
      expect(call.model).toBe('gemini-2.5-flash-lite');
      expect(call.config.responseMimeType).toBe('application/json');
      expect(call.config.responseSchema).toBeDefined();
      expect(call.contents).toContain('You need to read more');
      expect(call.contents).toContain('Hook 1');
      expect(call.contents).toContain('Hook 3');
    });

    it('includes todayInput context in the prompt when provided', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          perHookFeedback: [
            { hookIndex: 0, matched: true, mismatches: [] },
            { hookIndex: 1, matched: true, mismatches: [] },
            { hookIndex: 2, matched: true, mismatches: [] },
          ],
        }),
      });

      await service.evaluate({
        ...makeInput(),
        todayInput: 'Shipped voice import today.',
      });

      const call = nthGeminiCall(0);
      expect(call.contents).toContain('Shipped voice import today.');
    });

    it('throws InternalServerErrorException when Gemini API call fails', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('network down'));

      await expect(service.evaluate(makeInput())).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('throws InternalServerErrorException when Gemini returns a non-JSON body', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'not-json' });

      await expect(service.evaluate(makeInput())).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('throws InternalServerErrorException when feedback length does not match input hook count', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          perHookFeedback: [
            { hookIndex: 0, matched: true, mismatches: [] },
            { hookIndex: 1, matched: true, mismatches: [] },
            // missing 3rd entry
          ],
        }),
      });

      await expect(service.evaluate(makeInput())).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('coerces missing/invalid optional fields safely while preserving explicit values', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          perHookFeedback: [
            { hookIndex: 0, matched: true }, // mismatches missing
            { matched: false, mismatches: ['no index field'] }, // hookIndex missing
            { hookIndex: 2, matched: false, mismatches: [42, 'valid reason'] }, // mixed types
          ],
        }),
      });

      const result = await service.evaluate(makeInput());

      expect(result.perHookFeedback[0].mismatches).toEqual([]);
      expect(result.perHookFeedback[1].hookIndex).toBe(1);
      expect(result.perHookFeedback[2].mismatches).toEqual(['valid reason']);
    });
  });
});
