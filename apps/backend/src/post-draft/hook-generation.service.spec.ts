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
import type {
  GeneratedHook,
  HookGenerationInput,
} from './types/hook-generation.type';
import type { VoiceEvaluationResult } from './types/voice-evaluation.type';
import { VoiceEvaluatorService } from './voice-evaluator.service';

interface CreateCall {
  model: string;
  messages: Array<{ role: string; content: string }>;
  response_format: { json_schema: { name: string } };
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

function makeRetryCompletion(texts: string[]): {
  choices: Array<{ message: { content: string } }>;
} {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify({ hooks: texts.map((t) => ({ text: t })) }),
        },
      },
    ],
  };
}

const validHooks: GeneratedHook[] = [
  { text: 'Story hook text here.', angleLabel: 'Failure → Success' },
  { text: '87% of founders say...', angleLabel: 'Data Hook' },
  {
    text: 'Most indie devs think marketing is optional.',
    angleLabel: 'Contrarian',
  },
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
    it('returns first-pass hooks when evaluator passes and no cliches found', async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(validHooks));
      mockEvaluate.mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result).toEqual({ hooks: validHooks });
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockEvaluate).toHaveBeenCalledTimes(1);
    });

    it('uses default model when OPENAI_MODEL env is not set', async () => {
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

    it('embeds analysis, fingerprint, and todayInput in the first-pass prompt', async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(validHooks));
      mockEvaluate.mockResolvedValueOnce(allMatchedResult);

      await service.generate(buildInput());

      const prompt = nthCall(0).messages[0].content;
      expect(prompt).toContain(analysisFixture.category);
      expect(prompt).toContain(styleFingerprintFixture.tonality);
      expect(prompt).toContain('you can feel it');
      expect(prompt).toContain('Shipped a new hook generation feature today.');
    });

    it('blocks Data angle when todayInput is null', async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(validHooks));
      mockEvaluate.mockResolvedValueOnce(allMatchedResult);

      await service.generate(buildInput({ todayInput: null }));

      const prompt = nthCall(0).messages[0].content;
      expect(prompt).toContain('No specific update today');
      expect(prompt).toContain('DO NOT use Data');
    });
  });

  describe('generate — first-pass error paths', () => {
    it('throws when first OpenAI call returns fewer than 3 hooks', async () => {
      mockCreate.mockResolvedValueOnce(
        makeCompletion([
          { text: 'only one', angleLabel: 'Story' },
          { text: 'and a second', angleLabel: 'Data' },
        ]),
      );

      await expect(service.generate(buildInput())).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockEvaluate).not.toHaveBeenCalled();
    });

    it('throws when OpenAI call rejects', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API timeout'));

      await expect(service.generate(buildInput())).rejects.toThrow(
        new InternalServerErrorException('Hook generation failed'),
      );
      expect(mockEvaluate).not.toHaveBeenCalled();
    });
  });

  describe('generate — selective regen (only failed hooks rewritten)', () => {
    it('regenerates only the single failed hook and preserves the other two unchanged', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validHooks))
        .mockResolvedValueOnce(makeRetryCompletion(['Fixed hook 3 text.']));
      mockEvaluate
        .mockResolvedValueOnce(
          mismatchResult([
            {
              hookIndex: 2,
              reasons: ['uses exclamation; reference posts have zero'],
            },
          ]),
        )
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result.hooks).toEqual([
        validHooks[0],
        validHooks[1],
        { text: 'Fixed hook 3 text.', angleLabel: 'Contrarian' },
      ]);
      expect(result.evaluationFeedback).toBeUndefined();
      expect(mockCreate).toHaveBeenCalledTimes(2);

      const retryCall = nthCall(1);
      expect(retryCall.response_format.json_schema.name).toBe('hook_retry');
      const retryPrompt = retryCall.messages[0].content;
      expect(retryPrompt).toContain('EDIT task');
      expect(retryPrompt).toContain('Approved hooks');
      expect(retryPrompt).toContain('Hooks to fix');
      // Approved (matched) hooks shown for context
      expect(retryPrompt).toContain('Story hook text here.');
      expect(retryPrompt).toContain('87% of founders say');
      // Failed hook shown with its specific issue
      expect(retryPrompt).toContain(
        'Most indie devs think marketing is optional.',
      );
      expect(retryPrompt).toContain(
        'uses exclamation; reference posts have zero',
      );
    });

    it('regenerates two failed hooks while preserving the matched one', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validHooks))
        .mockResolvedValueOnce(
          makeRetryCompletion(['Fixed hook 1.', 'Fixed hook 2.']),
        );
      mockEvaluate
        .mockResolvedValueOnce(
          mismatchResult([
            { hookIndex: 0, reasons: ['too long'] },
            { hookIndex: 1, reasons: ['cliche opener'] },
          ]),
        )
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result.hooks).toEqual([
        { text: 'Fixed hook 1.', angleLabel: 'Failure → Success' },
        { text: 'Fixed hook 2.', angleLabel: 'Data Hook' },
        validHooks[2], // hook 3 preserved
      ]);
    });

    it('regenerates all three when every hook fails', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validHooks))
        .mockResolvedValueOnce(
          makeRetryCompletion(['Fix 1.', 'Fix 2.', 'Fix 3.']),
        );
      mockEvaluate
        .mockResolvedValueOnce(
          mismatchResult([
            { hookIndex: 0, reasons: ['issue a'] },
            { hookIndex: 1, reasons: ['issue b'] },
            { hookIndex: 2, reasons: ['issue c'] },
          ]),
        )
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result.hooks).toEqual([
        { text: 'Fix 1.', angleLabel: 'Failure → Success' },
        { text: 'Fix 2.', angleLabel: 'Data Hook' },
        { text: 'Fix 3.', angleLabel: 'Contrarian' },
      ]);

      const retryPrompt = nthCall(1).messages[0].content;
      expect(retryPrompt).toContain('every hook needs fixing');
    });

    it('preserves the original angleLabel even if the retry response has no angleLabel field', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validHooks))
        .mockResolvedValueOnce(makeRetryCompletion(['Replacement text.']));
      mockEvaluate
        .mockResolvedValueOnce(
          mismatchResult([{ hookIndex: 1, reasons: ['fix this'] }]),
        )
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result.hooks[1]).toEqual({
        text: 'Replacement text.',
        angleLabel: 'Data Hook', // from validHooks[1], not from retry response
      });
    });

    it('falls back to first-pass hooks with feedback when retry response shape is invalid', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validHooks))
        .mockResolvedValueOnce(makeRetryCompletion(['only one', 'extra one'])); // expected 1, got 2
      mockEvaluate.mockResolvedValueOnce(
        mismatchResult([{ hookIndex: 0, reasons: ['x'] }]),
      );

      const result = await service.generate(buildInput());

      expect(result.hooks).toEqual(validHooks);
      expect(result.evaluationFeedback).toEqual(['hook1: x']);
    });

    it('falls back to first-pass hooks with feedback when the retry OpenAI call rejects', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validHooks))
        .mockRejectedValueOnce(new Error('retry API timeout'));
      mockEvaluate.mockResolvedValueOnce(
        mismatchResult([{ hookIndex: 1, reasons: ['cliche opener'] }]),
      );

      const result = await service.generate(buildInput());

      expect(result.hooks).toEqual(validHooks);
      expect(result.evaluationFeedback).toEqual(['hook2: cliche opener']);
      // Evaluator only consulted on first pass — retry never reached the second assess call
      expect(mockEvaluate).toHaveBeenCalledTimes(1);
    });
  });

  describe('generate — feedback persistence after failed retry', () => {
    it('returns merged hooks with evaluationFeedback when retry still has mismatches', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validHooks))
        .mockResolvedValueOnce(makeRetryCompletion(['Still bad text.']));
      mockEvaluate
        .mockResolvedValueOnce(
          mismatchResult([{ hookIndex: 2, reasons: ['original issue'] }]),
        )
        .mockResolvedValueOnce(
          mismatchResult([
            { hookIndex: 2, reasons: ['still has the same problem'] },
          ]),
        );

      const result = await service.generate(buildInput());

      expect(result.hooks[0]).toEqual(validHooks[0]);
      expect(result.hooks[1]).toEqual(validHooks[1]);
      expect(result.hooks[2]).toEqual({
        text: 'Still bad text.',
        angleLabel: 'Contrarian',
      });
      expect(result.evaluationFeedback).toEqual([
        'hook3: still has the same problem',
      ]);
    });
  });

  describe('generate — graceful degradation when evaluator fails', () => {
    it('returns first-pass hooks unchanged when evaluator throws and no cliches present', async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(validHooks));
      mockEvaluate.mockRejectedValueOnce(new Error('Gemini down'));

      const result = await service.generate(buildInput());

      expect(result).toEqual({ hooks: validHooks });
      expect(result.evaluationFeedback).toBeUndefined();
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockEvaluate).toHaveBeenCalledTimes(1);
    });

    it('returns merged hooks unchanged when retry-pass evaluator throws', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validHooks))
        .mockResolvedValueOnce(makeRetryCompletion(['Replacement.']));
      mockEvaluate
        .mockResolvedValueOnce(
          mismatchResult([{ hookIndex: 0, reasons: ['cliche opener'] }]),
        )
        .mockRejectedValueOnce(new Error('Gemini timeout on retry'));

      const result = await service.generate(buildInput());

      expect(result.hooks[0]).toEqual({
        text: 'Replacement.',
        angleLabel: 'Failure → Success',
      });
      expect(result.evaluationFeedback).toBeUndefined();
    });
  });

  describe('generate — deterministic cliche pre-filter', () => {
    const clicheHooks: GeneratedHook[] = [
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

    it('triggers retry on cliches even when evaluator says all-matched, regenerating only the cliche hooks', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(clicheHooks))
        .mockResolvedValueOnce(
          makeRetryCompletion(['Clean fix 2.', 'Clean fix 3.']),
        );
      mockEvaluate
        .mockResolvedValueOnce(allMatchedResult)
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result.hooks).toEqual([
        clicheHooks[0],
        { text: 'Clean fix 2.', angleLabel: 'Story' },
        { text: 'Clean fix 3.', angleLabel: 'Positioning' },
      ]);

      const retryPrompt = nthCall(1).messages[0].content;
      expect(retryPrompt).toContain('AI-cliche opener "Six months ago"');
      expect(retryPrompt).toContain('marketing cliche "game changer"');
    });

    it('triggers retry on cliches even when evaluator throws (cliche-only fallback)', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(clicheHooks))
        .mockResolvedValueOnce(
          makeRetryCompletion(['Clean fix 2.', 'Clean fix 3.']),
        );
      mockEvaluate
        .mockRejectedValueOnce(new Error('Gemini down'))
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result.hooks[0]).toEqual(clicheHooks[0]); // clean hook preserved
      expect(result.hooks[1].text).toBe('Clean fix 2.');
      expect(result.hooks[2].text).toBe('Clean fix 3.');
    });

    it('persists cliche feedback when retry still contains cliches', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(clicheHooks))
        .mockResolvedValueOnce(
          makeRetryCompletion([
            'Six months ago, I tried again.', // still has cliche opener
            'Still a game changer.', // still has marketing cliche
          ]),
        );
      mockEvaluate
        .mockResolvedValueOnce(allMatchedResult)
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

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
