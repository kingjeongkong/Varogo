import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { OpenAiService } from '../llm/openai.service';
import { ContentGenerationService } from './content-generation.service';
import type {
  ContentGenerationResult,
  GenerateContentInput,
} from './types/content-generation.type';

const mockCreate = jest.fn();

const mockOpenAiService = {
  getClient: jest.fn().mockReturnValue({
    chat: { completions: { create: mockCreate } },
  }),
};

const mockConfigService = {
  get: jest.fn(),
};

const VALID_INPUT: GenerateContentInput = {
  productAnalysis: {
    category: 'marketing copilot for indie devs',
    jobToBeDone:
      'When I launch a side project, I want a ready marketing plan, so I can get users.',
    targetAudience: { definition: 'Indie developers' },
    differentiators: ['AI-powered strategy'],
    positioningStatement: 'The marketing copilot for indie devs.',
    keywords: { primary: ['indie dev', 'marketing'], secondary: ['twitter'] },
  },
  strategy: {
    title: '스토리 기반',
    description: '창업 여정을 공유하여 공감대 형성',
    coreThesis: '진짜 창업자의 고민을 공유한다',
    campaignGoal: {
      type: 'community',
      description: '인디 개발자 커뮤니티 내 인지도 구축',
    },
    hookDirection: '실패 경험 공개형 빌딩 저널',
    ctaDirection: '댓글로 경험 공유해 주세요',
    contentFormat: '개인 경험 쓰레드',
  },
  template: {
    contentPattern: 'series',
    hookGuide: '실패 경험을 구체적 수치와 함께 제시',
    bodyStructure: [
      {
        name: '제목',
        guide: '호기심 유발형 한 문장',
        exampleSnippet: '3개월간 매출 0원',
      },
      {
        name: '도입',
        guide: '본인 경험 2~3문장',
        exampleSnippet: '그래서 전략을 바꿨습니다',
      },
      {
        name: '본문',
        guide: '실패와 학습 공유',
        exampleSnippet: '배운 점은 이것입니다',
      },
    ],
    ctaGuide: '피드백 요청으로 자연스럽게',
    toneGuide: '캐주얼하지만 진지, 과장 없이',
    lengthGuide: '각 포스트 180~240자, 총 8~10개 포스트',
    platformTips: ['해시태그 2~3개', '이미지 첨부', '오전 게시'],
    dontDoList: ['직접 홍보 금지', '과장 금지', '링크만 금지'],
  },
};

const VALID_RESULT: ContentGenerationResult = {
  body: '사이드 프로젝트를 만들었는데 아무도 안 써요. 이 글은 제가 마케팅을 배우면서 겪은 시행착오입니다...',
};

function buildChatResponse(payload: unknown) {
  return {
    choices: [
      {
        message: {
          content:
            typeof payload === 'string' ? payload : JSON.stringify(payload),
        },
      },
    ],
  };
}

describe('ContentGenerationService', () => {
  let service: ContentGenerationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ContentGenerationService,
        { provide: OpenAiService, useValue: mockOpenAiService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(ContentGenerationService);
    jest.clearAllMocks();

    mockOpenAiService.getClient.mockReturnValue({
      chat: { completions: { create: mockCreate } },
    });
    mockConfigService.get.mockReturnValue(undefined);
  });

  describe('generateContent', () => {
    it('returns parsed ContentGenerationResult on success', async () => {
      mockCreate.mockResolvedValue(buildChatResponse(VALID_RESULT));

      const result = await service.generateContent(VALID_INPUT);

      expect(result).toEqual(VALID_RESULT);
      expect(mockOpenAiService.getClient).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          response_format: expect.objectContaining({
            type: 'json_object',
          }) as Record<string, unknown>,
        }),
      );
    });

    it('uses OPENAI_MODEL from config when provided', async () => {
      mockConfigService.get.mockReturnValue('gpt-4o');
      mockCreate.mockResolvedValue(buildChatResponse(VALID_RESULT));

      const module = await Test.createTestingModule({
        providers: [
          ContentGenerationService,
          { provide: OpenAiService, useValue: mockOpenAiService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const svc = module.get(ContentGenerationService);

      await svc.generateContent(VALID_INPUT);

      const calls = mockCreate.mock.calls as Array<[{ model: string }]>;
      expect(calls[calls.length - 1][0].model).toBe('gpt-4o');
    });

    it('includes product, strategy, and template context in prompt', async () => {
      mockCreate.mockResolvedValue(buildChatResponse(VALID_RESULT));

      await service.generateContent(VALID_INPUT);

      const calls = mockCreate.mock.calls as Array<
        [{ messages: Array<{ content: string }> }]
      >;
      const prompt = calls[0][0].messages[0].content;
      expect(prompt).toContain('Indie developers');
      expect(prompt).toContain('AI-powered strategy');
      expect(prompt).toContain('Threads');
      expect(prompt).toContain('스토리 기반');
      expect(prompt).toContain('진짜 창업자의 고민을 공유한다');
      expect(prompt).toContain('실패 경험 공개형 빌딩 저널');
      expect(prompt).toContain('캐주얼하지만 진지, 과장 없이');
    });

    it('throws InternalServerErrorException when OpenAI returns invalid JSON', async () => {
      mockCreate.mockResolvedValue(buildChatResponse('not valid json {{{'));

      await expect(service.generateContent(VALID_INPUT)).rejects.toThrow(
        InternalServerErrorException,
      );

      await expect(service.generateContent(VALID_INPUT)).rejects.toThrow(
        'Content generation failed',
      );
    });

    it('throws InternalServerErrorException when OpenAI API fails', async () => {
      mockCreate.mockRejectedValue(new Error('API timeout'));

      await expect(service.generateContent(VALID_INPUT)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws InternalServerErrorException when body is missing', async () => {
      mockCreate.mockResolvedValue(buildChatResponse({ noBody: 'test' }));

      await expect(service.generateContent(VALID_INPUT)).rejects.toThrow(
        'body must be a non-empty string',
      );
    });

    it('throws InternalServerErrorException when body is empty string', async () => {
      mockCreate.mockResolvedValue(buildChatResponse({ body: '   ' }));

      await expect(service.generateContent(VALID_INPUT)).rejects.toThrow(
        'body must be a non-empty string',
      );
    });
  });
});
