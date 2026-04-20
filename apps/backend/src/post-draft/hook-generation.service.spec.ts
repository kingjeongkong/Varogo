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

const mockCreate = jest.fn();

const mockOpenAiService = {
  getClient: jest.fn().mockReturnValue({
    chat: { completions: { create: mockCreate } },
  }),
};

const mockConfigService = {
  get: jest.fn(),
};

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

describe('HookGenerationService', () => {
  let service: HookGenerationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        HookGenerationService,
        { provide: OpenAiService, useValue: mockOpenAiService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(HookGenerationService);
    jest.clearAllMocks();

    mockOpenAiService.getClient.mockReturnValue({
      chat: { completions: { create: mockCreate } },
    });
  });

  describe('generate', () => {
    const validHooks = [
      { text: 'Story hook text here.', angleLabel: 'Failure → Success' },
      { text: '87% of founders say...', angleLabel: 'Data Hook' },
      {
        text: 'Most indie devs think marketing is optional.',
        angleLabel: 'Contrarian',
      },
    ];

    it('returns { hooks } when OpenAI returns 3 valid hooks', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      mockCreate.mockResolvedValueOnce(makeCompletion(validHooks));

      const result = await service.generate(buildInput());

      expect(result).toEqual({ hooks: validHooks });
    });

    it('includes analysis.category, tonality, signaturePhrases, and todayInput in the prompt', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      mockCreate.mockResolvedValueOnce(makeCompletion(validHooks));

      await service.generate(buildInput());

      const promptContent = mockCreate.mock.calls[0][0].messages[0]
        .content as string;

      expect(promptContent).toContain(analysisFixture.category);
      expect(promptContent).toContain(styleFingerprintFixture.tonality);
      expect(promptContent).toContain('you can feel it');
      expect(promptContent).toContain('which, fine.');
      expect(promptContent).toContain(
        'Shipped a new hook generation feature today.',
      );
    });

    it('uses fallback message in prompt when todayInput is null', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      mockCreate.mockResolvedValueOnce(makeCompletion(validHooks));

      await service.generate(buildInput({ todayInput: null }));

      const promptContent = mockCreate.mock.calls[0][0].messages[0]
        .content as string;

      expect(promptContent).toContain(
        "No specific update today. Draw from the product's positioning.",
      );
    });

    it('throws InternalServerErrorException when OpenAI returns fewer than 3 hooks', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      mockCreate.mockResolvedValueOnce(
        makeCompletion([
          { text: 'only one hook', angleLabel: 'Story' },
          { text: 'and a second', angleLabel: 'Data' },
        ]),
      );

      await expect(service.generate(buildInput())).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws InternalServerErrorException("Hook generation failed") when OpenAI call rejects', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      mockCreate.mockRejectedValueOnce(new Error('API timeout'));

      await expect(service.generate(buildInput())).rejects.toThrow(
        new InternalServerErrorException('Hook generation failed'),
      );
    });

    it('uses default "gpt-4o-mini" model when OPENAI_MODEL env is not set', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      mockCreate.mockResolvedValueOnce(makeCompletion(validHooks));

      await service.generate(buildInput());

      expect(mockCreate.mock.calls[0][0].model).toBe('gpt-4o-mini');
    });

    it('uses OPENAI_MODEL env value when configured', async () => {
      mockConfigService.get.mockReturnValue('gpt-4o');
      mockCreate.mockResolvedValueOnce(makeCompletion(validHooks));

      await service.generate(buildInput());

      expect(mockConfigService.get).toHaveBeenCalledWith('OPENAI_MODEL');
      expect(mockCreate.mock.calls[0][0].model).toBe('gpt-4o');
    });
  });
});
