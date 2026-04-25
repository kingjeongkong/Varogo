import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { OpenAiService } from '../llm/openai.service';
import type { ProductAnalysisResult } from '../product/types/product-analysis.type';
import type {
  ReferenceSample,
  StyleFingerprint,
} from '../voice-profile/types/style-fingerprint.type';
import { HookGenerationService } from './hook-generation.service';
import type { HookGenerationInput } from './types/hook-generation.type';
import type { VoiceEvaluationResult } from './types/voice-evaluation.type';
import { VoiceEvaluatorService } from './voice-evaluator.service';

interface CreateCall {
  model: string;
  messages: Array<{ role: string; content: string }>;
  response_format: unknown;
}

const mockCreate: jest.Mock = jest.fn();

function nthCall(n: number): CreateCall {
  const calls = mockCreate.mock.calls as unknown as CreateCall[][];
  return calls[n][0];
}

const mockOpenAiService = {
  getClient: jest.fn().mockReturnValue({
    chat: { completions: { create: mockCreate } },
  }),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockEvaluate = jest.fn();
const mockVoiceEvaluator = {
  evaluate: mockEvaluate,
};

const allMatchedResult: VoiceEvaluationResult = {
  allMatched: true,
  perHookFeedback: [
    { hookIndex: 0, matched: true, mismatches: [] },
    { hookIndex: 1, matched: true, mismatches: [] },
    { hookIndex: 2, matched: true, mismatches: [] },
  ],
};

function mismatchResult(
  mismatches: Array<{ hookIndex: number; reasons: string[] }>,
): VoiceEvaluationResult {
  return {
    allMatched: false,
    perHookFeedback: [0, 1, 2].map((i) => {
      const found = mismatches.find((m) => m.hookIndex === i);
      return found
        ? { hookIndex: i, matched: false, mismatches: found.reasons }
        : { hookIndex: i, matched: true, mismatches: [] };
    }),
  };
}

const analysisFixture: ProductAnalysisResult = {
  category: 'marketing copilot for indie devs',
  jobToBeDone:
    'When I launch a side project, I want a ready marketing plan, so I can get users.',
  whyNow: 'AI made building fast; marketing is the new bottleneck.',
  targetAudience: {
    definition: 'Indie developers shipping side projects',
    painPoints: ['no marketing skills', 'no budget for ads'],
    buyingTriggers: ['When launching a side project'],
    activeCommunities: ['Twitter', 'IndieHackers'],
  },
  valueProposition: 'Get a marketing strategy in 5 minutes.',
  alternatives: [
    {
      name: 'Notion templates',
      description: 'Static marketing plan templates',
      weaknessWeExploit: 'not personalized to the product',
    },
    {
      name: 'Marketing agency',
      description: 'Full-service paid agency',
      weaknessWeExploit: 'too expensive for indies',
    },
  ],
  differentiators: ['AI-powered', 'Threads-native', 'Voice-matched'],
  positioningStatement: 'The marketing copilot for indie devs shipping solo.',
  keywords: {
    primary: ['indie', 'marketing'],
    secondary: ['threads', 'copilot'],
  },
};

const styleFingerprintFixture: StyleFingerprint = {
  tonality: 'opens with deadpan single-line observations',
  avgLength: 180,
  openingPatterns: ['Starts with a noun phrase', 'Begins with a question'],
  signaturePhrases: ['you can feel it', 'which, fine.'],
  emojiDensity: 0.5,
  hashtagUsage: 1.2,
};

const referenceSamplesFixture: ReferenceSample[] = [
  { text: 'first post text', date: '2026-04-19T12:00:00Z' },
  { text: 'second post text', date: '2026-04-18T12:00:00Z' },
  { text: 'third post text', date: '2026-04-17T12:00:00Z' },
];

function buildInput(
  overrides: Partial<HookGenerationInput> = {},
): HookGenerationInput {
  return {
    analysis: analysisFixture,
    styleFingerprint: styleFingerprintFixture,
    referenceSamples: referenceSamplesFixture,
    todayInput: 'Shipped a new hook generation feature today.',
    ...overrides,
  };
}

function makeCompletion(hooks: unknown): {
  choices: Array<{ message: { content: string } }>;
} {
  return {
    choices: [{ message: { content: JSON.stringify({ hooks }) } }],
  };
}

const validHooks = [
  { text: 'Story hook text here.', angleLabel: 'Failure → Success' },
  { text: '87% of founders say...', angleLabel: 'Data Hook' },
  {
    text: 'Most indie devs think marketing is optional.',
    angleLabel: 'Contrarian',
  },
];

const retryHooks = [
  { text: 'Retry story hook.', angleLabel: 'Story' },
  { text: 'Retry contrarian hook.', angleLabel: 'Contrarian' },
  { text: 'Retry positioning hook.', angleLabel: 'Positioning' },
];

describe('HookGenerationService', () => {
  let service: HookGenerationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        HookGenerationService,
        { provide: OpenAiService, useValue: mockOpenAiService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: VoiceEvaluatorService, useValue: mockVoiceEvaluator },
      ],
    }).compile();

    service = module.get(HookGenerationService);
    jest.clearAllMocks();

    mockOpenAiService.getClient.mockReturnValue({
      chat: { completions: { create: mockCreate } },
    });
    mockConfigService.get.mockReturnValue(undefined);
  });

  describe('generate — happy path', () => {
    it('returns { hooks } when OpenAI returns 3 valid hooks and evaluator passes', async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(validHooks));
      mockEvaluate.mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result).toEqual({ hooks: validHooks });
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockEvaluate).toHaveBeenCalledTimes(1);
    });

    it('includes analysis.category, tonality, signaturePhrases, and todayInput in the prompt', async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(validHooks));
      mockEvaluate.mockResolvedValueOnce(allMatchedResult);

      await service.generate(buildInput());

      const promptContent = nthCall(0).messages[0].content;

      expect(promptContent).toContain(analysisFixture.category);
      expect(promptContent).toContain(styleFingerprintFixture.tonality);
      expect(promptContent).toContain('you can feel it');
      expect(promptContent).toContain('which, fine.');
      expect(promptContent).toContain(
        'Shipped a new hook generation feature today.',
      );
    });

    it('blocks Data angle and forbids invented numbers in prompt when todayInput is null', async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(validHooks));
      mockEvaluate.mockResolvedValueOnce(allMatchedResult);

      await service.generate(buildInput({ todayInput: null }));

      const promptContent = nthCall(0).messages[0].content;

      expect(promptContent).toContain('No specific update today');
      expect(promptContent).toContain('DO NOT use Data');
      expect(promptContent).toContain('DO NOT invent statistics');
    });

    it('uses default "gpt-4o-mini" model when OPENAI_MODEL env is not set', async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(validHooks));
      mockEvaluate.mockResolvedValueOnce(allMatchedResult);

      await service.generate(buildInput());

      expect(nthCall(0).model).toBe('gpt-4o-mini');
    });

    it('uses OPENAI_MODEL env value when configured', async () => {
      mockConfigService.get.mockReturnValue('gpt-4o');
      mockCreate.mockResolvedValueOnce(makeCompletion(validHooks));
      mockEvaluate.mockResolvedValueOnce(allMatchedResult);

      await service.generate(buildInput());

      expect(mockConfigService.get).toHaveBeenCalledWith('OPENAI_MODEL');
      expect(nthCall(0).model).toBe('gpt-4o');
    });
  });

  describe('generate — error paths from OpenAI', () => {
    it('throws InternalServerErrorException when OpenAI returns fewer than 3 hooks', async () => {
      mockCreate.mockResolvedValueOnce(
        makeCompletion([
          { text: 'only one hook', angleLabel: 'Story' },
          { text: 'and a second', angleLabel: 'Data' },
        ]),
      );

      await expect(service.generate(buildInput())).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockEvaluate).not.toHaveBeenCalled();
    });

    it('throws InternalServerErrorException("Hook generation failed") when OpenAI call rejects', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API timeout'));

      await expect(service.generate(buildInput())).rejects.toThrow(
        new InternalServerErrorException('Hook generation failed'),
      );
      expect(mockEvaluate).not.toHaveBeenCalled();
    });
  });

  describe('generate — voice evaluator retry loop', () => {
    it('retries once with feedback when first evaluation is mismatch and returns regenerated hooks if second pass is matched', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validHooks))
        .mockResolvedValueOnce(makeCompletion(retryHooks));
      mockEvaluate
        .mockResolvedValueOnce(
          mismatchResult([
            {
              hookIndex: 1,
              reasons: ['uses exclamation; reference posts have zero'],
            },
          ]),
        )
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result).toEqual({ hooks: retryHooks });
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockEvaluate).toHaveBeenCalledTimes(2);
      // Retry prompt must include feedback section.
      const retryPrompt = nthCall(1).messages[0].content;
      expect(retryPrompt).toContain('Previous attempt feedback');
      expect(retryPrompt).toContain(
        'hook2: uses exclamation; reference posts have zero',
      );
    });

    it('returns hooks with evaluationFeedback when both attempts mismatch', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validHooks))
        .mockResolvedValueOnce(makeCompletion(retryHooks));
      mockEvaluate
        .mockResolvedValueOnce(
          mismatchResult([{ hookIndex: 0, reasons: ['too long'] }]),
        )
        .mockResolvedValueOnce(
          mismatchResult([{ hookIndex: 2, reasons: ['hashtag used'] }]),
        );

      const result = await service.generate(buildInput());

      expect(result.hooks).toEqual(retryHooks);
      expect(result.evaluationFeedback).toEqual(['hook3: hashtag used']);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('generate — graceful degradation when evaluator fails', () => {
    it('returns first-pass hooks without evaluationFeedback when first evaluator call throws and no cliches present', async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(validHooks));
      mockEvaluate.mockRejectedValueOnce(new Error('Gemini down'));

      const result = await service.generate(buildInput());

      expect(result).toEqual({ hooks: validHooks });
      expect(result.evaluationFeedback).toBeUndefined();
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockEvaluate).toHaveBeenCalledTimes(1);
    });

    it('returns retry hooks without evaluationFeedback when second evaluator call throws after first reported mismatch', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validHooks))
        .mockResolvedValueOnce(makeCompletion(retryHooks));
      mockEvaluate
        .mockResolvedValueOnce(
          mismatchResult([{ hookIndex: 0, reasons: ['cliche opener'] }]),
        )
        .mockRejectedValueOnce(new Error('Gemini timeout on retry'));

      const result = await service.generate(buildInput());

      expect(result).toEqual({ hooks: retryHooks });
      expect(result.evaluationFeedback).toBeUndefined();
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockEvaluate).toHaveBeenCalledTimes(2);
    });
  });

  describe('generate — deterministic cliche pre-filter', () => {
    const clicheHooks = [
      { text: 'Story hook text here.', angleLabel: 'Story' },
      {
        text: 'Six months ago, I was lost in copywriting.',
        angleLabel: 'Story',
      },
      {
        text: 'This product is a game-changer for indie devs.',
        angleLabel: 'Positioning',
      },
    ];

    it('triggers retry with cliche feedback when evaluator says all-matched but pre-filter catches cliches', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(clicheHooks))
        .mockResolvedValueOnce(makeCompletion(validHooks));
      mockEvaluate
        .mockResolvedValueOnce(allMatchedResult)
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result).toEqual({ hooks: validHooks });
      expect(mockCreate).toHaveBeenCalledTimes(2);

      const retryPrompt = nthCall(1).messages[0].content;
      expect(retryPrompt).toContain('Previous attempt feedback');
      expect(retryPrompt).toContain('AI-cliche opener "Six months ago"');
      expect(retryPrompt).toContain('marketing cliche "game changer"');
    });

    it('triggers retry with cliche feedback even when evaluator throws, instead of silently passing', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(clicheHooks))
        .mockResolvedValueOnce(makeCompletion(validHooks));
      mockEvaluate
        .mockRejectedValueOnce(new Error('Gemini down'))
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result).toEqual({ hooks: validHooks });
      expect(mockCreate).toHaveBeenCalledTimes(2);
      const retryPrompt = nthCall(1).messages[0].content;
      expect(retryPrompt).toContain('AI-cliche opener "Six months ago"');
      expect(retryPrompt).toContain('marketing cliche "game changer"');
    });

    it('returns hooks with persisted cliche feedback when retry still contains cliches and evaluator agrees match', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(clicheHooks))
        .mockResolvedValueOnce(makeCompletion(clicheHooks));
      mockEvaluate
        .mockResolvedValueOnce(allMatchedResult)
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result.hooks).toEqual(clicheHooks);
      expect(result.evaluationFeedback).toBeDefined();
      expect(result.evaluationFeedback).toEqual(
        expect.arrayContaining([
          expect.stringContaining('AI-cliche opener "Six months ago"'),
          expect.stringContaining('marketing cliche "game changer"'),
        ]),
      );
    });
  });
});
