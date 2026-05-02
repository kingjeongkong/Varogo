import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { OpenAiService } from '../llm/openai.service';
import type { ProductAnalysisResult } from '../product/types/product-analysis.type';
import type {
  ReferenceSample,
  StyleFingerprint,
} from '../voice-profile/types/style-fingerprint.type';
import { PostDraftOptionGenerationService } from './post-draft-option-generation.service';
import type {
  GeneratedPostDraftOption,
  PostDraftOptionGenerationInput,
} from './types/post-draft-option-generation.type';
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
  perOptionFeedback: [
    { optionIndex: 0, matched: true, mismatches: [] },
    { optionIndex: 1, matched: true, mismatches: [] },
    { optionIndex: 2, matched: true, mismatches: [] },
  ],
};

function mismatchResult(
  mismatches: Array<{ optionIndex: number; reasons: string[] }>,
): VoiceEvaluationResult {
  return {
    allMatched: false,
    perOptionFeedback: [0, 1, 2].map((i) => {
      const found = mismatches.find((m) => m.optionIndex === i);
      return found
        ? { optionIndex: i, matched: false, mismatches: found.reasons }
        : { optionIndex: i, matched: true, mismatches: [] };
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
  overrides: Partial<PostDraftOptionGenerationInput> = {},
): PostDraftOptionGenerationInput {
  return {
    analysis: analysisFixture,
    styleFingerprint: styleFingerprintFixture,
    referenceSamples: referenceSamplesFixture,
    todayInput: 'Shipped a new angle generation feature today.',
    ...overrides,
  };
}

function makeCompletion(options: unknown): {
  choices: Array<{ message: { content: string } }>;
} {
  return {
    choices: [{ message: { content: JSON.stringify({ options }) } }],
  };
}

function makeRetryCompletion(texts: string[]): {
  choices: Array<{ message: { content: string } }>;
} {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify({ options: texts.map((t) => ({ text: t })) }),
        },
      },
    ],
  };
}

const validOptions: GeneratedPostDraftOption[] = [
  { text: 'Story option text here.', angleLabel: 'Failure → Success' },
  { text: '87% of founders say...', angleLabel: 'Data' },
  {
    text: 'Most indie devs think marketing is optional.',
    angleLabel: 'Contrarian',
  },
];

describe('PostDraftOptionGenerationService', () => {
  let service: PostDraftOptionGenerationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PostDraftOptionGenerationService,
        { provide: OpenAiService, useValue: mockOpenAiService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: VoiceEvaluatorService, useValue: mockVoiceEvaluator },
      ],
    }).compile();

    service = module.get(PostDraftOptionGenerationService);
    jest.clearAllMocks();

    mockOpenAiService.getClient.mockReturnValue({
      chat: { completions: { create: mockCreate } },
    });
    mockConfigService.get.mockReturnValue(undefined);
  });

  describe('generate — happy path', () => {
    it('returns first-pass options when evaluator passes and no cliches found', async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(validOptions));
      mockEvaluate.mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result).toEqual({ options: validOptions });
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockEvaluate).toHaveBeenCalledTimes(1);
    });

    it('uses default model when OPENAI_MODEL env is not set', async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(validOptions));
      mockEvaluate.mockResolvedValueOnce(allMatchedResult);

      await service.generate(buildInput());

      expect(nthCall(0).model).toBe('gpt-4o-mini');
    });

    it('uses OPENAI_MODEL env value when configured', async () => {
      mockConfigService.get.mockReturnValue('gpt-4o');
      mockCreate.mockResolvedValueOnce(makeCompletion(validOptions));
      mockEvaluate.mockResolvedValueOnce(allMatchedResult);

      await service.generate(buildInput());

      expect(mockConfigService.get).toHaveBeenCalledWith('OPENAI_MODEL');
      expect(nthCall(0).model).toBe('gpt-4o');
    });

    it('embeds analysis, fingerprint, and todayInput in the first-pass prompt', async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(validOptions));
      mockEvaluate.mockResolvedValueOnce(allMatchedResult);

      await service.generate(buildInput());

      const prompt = nthCall(0).messages[0].content;
      expect(prompt).toContain(analysisFixture.category);
      expect(prompt).toContain(styleFingerprintFixture.tonality);
      expect(prompt).toContain('you can feel it');
      expect(prompt).toContain('Shipped a new angle generation feature today.');
    });

    it('blocks Data angle when todayInput is null', async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(validOptions));
      mockEvaluate.mockResolvedValueOnce(allMatchedResult);

      await service.generate(buildInput({ todayInput: null }));

      const prompt = nthCall(0).messages[0].content;
      expect(prompt).toContain('No specific update today');
      expect(prompt).toContain('DO NOT use Data');
    });
  });

  describe('generate — first-pass error paths', () => {
    it('throws when first OpenAI call returns fewer than 3 options', async () => {
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
        new InternalServerErrorException('Option generation failed'),
      );
      expect(mockEvaluate).not.toHaveBeenCalled();
    });
  });

  describe('generate — selective regen (only failed options rewritten)', () => {
    it('regenerates only the single failed option and preserves the other two unchanged', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validOptions))
        .mockResolvedValueOnce(makeRetryCompletion(['Fixed option 3 text.']));
      mockEvaluate
        .mockResolvedValueOnce(
          mismatchResult([
            {
              optionIndex: 2,
              reasons: ['uses exclamation; reference posts have zero'],
            },
          ]),
        )
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result.options).toEqual([
        validOptions[0],
        validOptions[1],
        { text: 'Fixed option 3 text.', angleLabel: 'Contrarian' },
      ]);
      expect(result.evaluationFeedback).toBeUndefined();
      expect(mockCreate).toHaveBeenCalledTimes(2);

      const retryCall = nthCall(1);
      expect(retryCall.response_format.json_schema.name).toBe('option_retry');
      const retryPrompt = retryCall.messages[0].content;
      expect(retryPrompt).toContain('EDIT task');
      expect(retryPrompt).toContain('Approved options');
      expect(retryPrompt).toContain('Options to fix');
      // Approved (matched) options shown for context
      expect(retryPrompt).toContain('Story option text here.');
      expect(retryPrompt).toContain('87% of founders say');
      // Failed option shown with its specific issue
      expect(retryPrompt).toContain(
        'Most indie devs think marketing is optional.',
      );
      expect(retryPrompt).toContain(
        'uses exclamation; reference posts have zero',
      );
    });

    it('regenerates two failed options while preserving the matched one', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validOptions))
        .mockResolvedValueOnce(
          makeRetryCompletion(['Fixed option 1.', 'Fixed option 2.']),
        );
      mockEvaluate
        .mockResolvedValueOnce(
          mismatchResult([
            { optionIndex: 0, reasons: ['too long'] },
            { optionIndex: 1, reasons: ['cliche opener'] },
          ]),
        )
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result.options).toEqual([
        { text: 'Fixed option 1.', angleLabel: 'Failure → Success' },
        { text: 'Fixed option 2.', angleLabel: 'Data' },
        validOptions[2], // option 3 preserved
      ]);
    });

    it('regenerates all three when every option fails', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validOptions))
        .mockResolvedValueOnce(
          makeRetryCompletion(['Fix 1.', 'Fix 2.', 'Fix 3.']),
        );
      mockEvaluate
        .mockResolvedValueOnce(
          mismatchResult([
            { optionIndex: 0, reasons: ['issue a'] },
            { optionIndex: 1, reasons: ['issue b'] },
            { optionIndex: 2, reasons: ['issue c'] },
          ]),
        )
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result.options).toEqual([
        { text: 'Fix 1.', angleLabel: 'Failure → Success' },
        { text: 'Fix 2.', angleLabel: 'Data' },
        { text: 'Fix 3.', angleLabel: 'Contrarian' },
      ]);

      const retryPrompt = nthCall(1).messages[0].content;
      expect(retryPrompt).toContain('every option needs fixing');
    });

    it('preserves the original angleLabel even if the retry response has no angleLabel field', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validOptions))
        .mockResolvedValueOnce(makeRetryCompletion(['Replacement text.']));
      mockEvaluate
        .mockResolvedValueOnce(
          mismatchResult([{ optionIndex: 1, reasons: ['fix this'] }]),
        )
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result.options[1]).toEqual({
        text: 'Replacement text.',
        angleLabel: 'Data', // from validOptions[1], not from retry response
      });
    });

    it('falls back to first-pass options with feedback when retry response shape is invalid', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validOptions))
        .mockResolvedValueOnce(makeRetryCompletion(['only one', 'extra one'])); // expected 1, got 2
      mockEvaluate.mockResolvedValueOnce(
        mismatchResult([{ optionIndex: 0, reasons: ['x'] }]),
      );

      const result = await service.generate(buildInput());

      expect(result.options).toEqual(validOptions);
      expect(result.evaluationFeedback).toEqual(['option1: x']);
    });

    it('falls back to first-pass options with feedback when the retry OpenAI call rejects', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validOptions))
        .mockRejectedValueOnce(new Error('retry API timeout'));
      mockEvaluate.mockResolvedValueOnce(
        mismatchResult([{ optionIndex: 1, reasons: ['cliche opener'] }]),
      );

      const result = await service.generate(buildInput());

      expect(result.options).toEqual(validOptions);
      expect(result.evaluationFeedback).toEqual(['option2: cliche opener']);
      // Evaluator only consulted on first pass — retry never reached the second assess call
      expect(mockEvaluate).toHaveBeenCalledTimes(1);
    });
  });

  describe('generate — feedback persistence after failed retry', () => {
    it('returns merged options with evaluationFeedback when retry still has mismatches', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validOptions))
        .mockResolvedValueOnce(makeRetryCompletion(['Still bad text.']));
      mockEvaluate
        .mockResolvedValueOnce(
          mismatchResult([{ optionIndex: 2, reasons: ['original issue'] }]),
        )
        .mockResolvedValueOnce(
          mismatchResult([
            { optionIndex: 2, reasons: ['still has the same problem'] },
          ]),
        );

      const result = await service.generate(buildInput());

      expect(result.options[0]).toEqual(validOptions[0]);
      expect(result.options[1]).toEqual(validOptions[1]);
      expect(result.options[2]).toEqual({
        text: 'Still bad text.',
        angleLabel: 'Contrarian',
      });
      expect(result.evaluationFeedback).toEqual([
        'option3: still has the same problem',
      ]);
    });
  });

  describe('generate — graceful degradation when evaluator fails', () => {
    it('returns first-pass options unchanged when evaluator throws and no cliches present', async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(validOptions));
      mockEvaluate.mockRejectedValueOnce(new Error('Gemini down'));

      const result = await service.generate(buildInput());

      expect(result).toEqual({ options: validOptions });
      expect(result.evaluationFeedback).toBeUndefined();
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockEvaluate).toHaveBeenCalledTimes(1);
    });

    it('returns merged options unchanged when retry-pass evaluator throws', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(validOptions))
        .mockResolvedValueOnce(makeRetryCompletion(['Replacement.']));
      mockEvaluate
        .mockResolvedValueOnce(
          mismatchResult([{ optionIndex: 0, reasons: ['cliche opener'] }]),
        )
        .mockRejectedValueOnce(new Error('Gemini timeout on retry'));

      const result = await service.generate(buildInput());

      expect(result.options[0]).toEqual({
        text: 'Replacement.',
        angleLabel: 'Failure → Success',
      });
      expect(result.evaluationFeedback).toBeUndefined();
    });
  });

  describe('generate — deterministic cliche pre-filter', () => {
    const clicheOptions: GeneratedPostDraftOption[] = [
      { text: 'Story option text here.', angleLabel: 'Story' },
      {
        text: 'Six months ago, I was lost in copywriting.',
        angleLabel: 'Story',
      },
      {
        text: 'This product is a game-changer for indie devs.',
        angleLabel: 'Positioning',
      },
    ];

    it('triggers retry on cliches even when evaluator says all-matched, regenerating only the cliche options', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(clicheOptions))
        .mockResolvedValueOnce(
          makeRetryCompletion(['Clean fix 2.', 'Clean fix 3.']),
        );
      mockEvaluate
        .mockResolvedValueOnce(allMatchedResult)
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result.options).toEqual([
        clicheOptions[0],
        { text: 'Clean fix 2.', angleLabel: 'Story' },
        { text: 'Clean fix 3.', angleLabel: 'Positioning' },
      ]);

      const retryPrompt = nthCall(1).messages[0].content;
      expect(retryPrompt).toContain('AI-cliche opener "Six months ago"');
      expect(retryPrompt).toContain('marketing cliche "game changer"');
    });

    it('triggers retry on cliches even when evaluator throws (cliche-only fallback)', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(clicheOptions))
        .mockResolvedValueOnce(
          makeRetryCompletion(['Clean fix 2.', 'Clean fix 3.']),
        );
      mockEvaluate
        .mockRejectedValueOnce(new Error('Gemini down'))
        .mockResolvedValueOnce(allMatchedResult);

      const result = await service.generate(buildInput());

      expect(result.options[0]).toEqual(clicheOptions[0]); // clean option preserved
      expect(result.options[1].text).toBe('Clean fix 2.');
      expect(result.options[2].text).toBe('Clean fix 3.');
    });

    it('persists cliche feedback when retry still contains cliches', async () => {
      mockCreate
        .mockResolvedValueOnce(makeCompletion(clicheOptions))
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
