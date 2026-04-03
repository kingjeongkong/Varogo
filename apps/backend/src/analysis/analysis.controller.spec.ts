import { Test } from '@nestjs/testing';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

const mockAnalysisService = {
  create: jest.fn(),
  findByProduct: jest.fn(),
};

const mockUser: JwtPayload = { sub: 'user-1', email: 'test@example.com' };

describe('AnalysisController', () => {
  let controller: AnalysisController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AnalysisController],
      providers: [{ provide: AnalysisService, useValue: mockAnalysisService }],
    }).compile();

    controller = module.get(AnalysisController);
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // analyze (POST :id/analyze)
  // -----------------------------------------------------------------------
  describe('analyze', () => {
    it('delegates to analysisService.create with productId and user.sub', async () => {
      const analysis = {
        id: 'ana-1',
        summary: 'summary',
        productId: 'prod-1',
        createdAt: new Date(),
      };
      mockAnalysisService.create.mockResolvedValue(analysis);

      const result = await controller.analyze('prod-1', mockUser);

      expect(mockAnalysisService.create).toHaveBeenCalledWith(
        'prod-1',
        'user-1',
      );
      expect(result).toEqual(analysis);
    });
  });

  // -----------------------------------------------------------------------
  // findAll (GET :id/analyses)
  // -----------------------------------------------------------------------
  describe('findAll', () => {
    it('delegates to analysisService.findByProduct with productId and user.sub', async () => {
      const analyses = [
        { id: 'ana-1', summary: 'First', createdAt: new Date() },
        { id: 'ana-2', summary: 'Second', createdAt: new Date() },
      ];
      mockAnalysisService.findByProduct.mockResolvedValue(analyses);

      const result = await controller.findAll('prod-1', mockUser);

      expect(mockAnalysisService.findByProduct).toHaveBeenCalledWith(
        'prod-1',
        'user-1',
      );
      expect(result).toEqual(analyses);
    });
  });
});
