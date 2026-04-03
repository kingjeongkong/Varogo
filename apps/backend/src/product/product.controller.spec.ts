import { Test } from '@nestjs/testing';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

const mockProductService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
};

const mockUser: JwtPayload = { sub: 'user-1', email: 'test@example.com' };

describe('ProductController', () => {
  let controller: ProductController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: mockProductService }],
    }).compile();

    controller = module.get(ProductController);
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('delegates to productService.create with dto and user.sub', async () => {
      const dto = { name: 'My App', description: 'desc' };
      const created = {
        id: 'prod-1',
        ...dto,
        url: null,
        userId: 'user-1',
        createdAt: new Date(),
      };
      mockProductService.create.mockResolvedValue(created);

      const result = await controller.create(dto, mockUser);

      expect(mockProductService.create).toHaveBeenCalledWith(dto, 'user-1');
      expect(result).toEqual(created);
    });
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------
  describe('findAll', () => {
    it('delegates to productService.findAll with user.sub', async () => {
      const products = [{ id: 'prod-1', name: 'My App' }];
      mockProductService.findAll.mockResolvedValue(products);

      const result = await controller.findAll(mockUser);

      expect(mockProductService.findAll).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(products);
    });
  });

  // -----------------------------------------------------------------------
  // findOne
  // -----------------------------------------------------------------------
  describe('findOne', () => {
    it('delegates to productService.findOne with id and user.sub', async () => {
      const product = { id: 'prod-1', name: 'My App', latestAnalysis: null };
      mockProductService.findOne.mockResolvedValue(product);

      const result = await controller.findOne('prod-1', mockUser);

      expect(mockProductService.findOne).toHaveBeenCalledWith(
        'prod-1',
        'user-1',
      );
      expect(result).toEqual(product);
    });
  });
});
