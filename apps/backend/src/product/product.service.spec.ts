import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProductService } from './product.service';

const mockPrisma = {
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ProductService);
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('calls prisma.product.create with dto fields and userId', async () => {
      const created = {
        id: 'prod-1',
        name: 'My App',
        url: 'https://example.com',
        description: 'desc',
        userId: 'user-1',
        createdAt: new Date(),
      };
      mockPrisma.product.create.mockResolvedValue(created);

      const result = await service.create(
        { name: 'My App', url: 'https://example.com', description: 'desc' },
        'user-1',
      );

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: {
          name: 'My App',
          url: 'https://example.com',
          description: 'desc',
          userId: 'user-1',
        },
      });
      expect(result).toEqual(created);
    });

    it('stores null for url when url is not provided', async () => {
      mockPrisma.product.create.mockResolvedValue({
        id: 'prod-2',
        name: 'No URL App',
        url: null,
        description: 'desc',
        userId: 'user-1',
        createdAt: new Date(),
      });

      await service.create(
        { name: 'No URL App', description: 'desc' },
        'user-1',
      );

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: {
          name: 'No URL App',
          url: null,
          description: 'desc',
          userId: 'user-1',
        },
      });
    });
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------
  describe('findAll', () => {
    it('calls prisma.product.findMany with userId filter and correct select', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findAll('user-1');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: {
          id: true,
          name: true,
          url: true,
          description: true,
          createdAt: true,
          _count: { select: { analyses: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns the list returned by prisma', async () => {
      const products = [
        {
          id: 'prod-1',
          name: 'App A',
          url: null,
          description: 'd',
          createdAt: new Date(),
          _count: { analyses: 2 },
        },
        {
          id: 'prod-2',
          name: 'App B',
          url: 'https://b.com',
          description: 'd',
          createdAt: new Date(),
          _count: { analyses: 0 },
        },
      ];
      mockPrisma.product.findMany.mockResolvedValue(products);

      const result = await service.findAll('user-1');

      expect(result).toEqual(products);
    });

    it('does NOT return products belonging to another user', async () => {
      // findAll for user-2 should use where: { userId: 'user-2' }
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findAll('user-2');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-2' } }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // findOne
  // -----------------------------------------------------------------------
  describe('findOne', () => {
    it('throws NotFoundException when product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when product belongs to another user', async () => {
      // Prisma uses composite where { id, userId }, so it returns null for wrong owner
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('prod-1', 'other-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('calls prisma.product.findUnique with id and userId', async () => {
      const product = {
        id: 'prod-1',
        name: 'My App',
        url: null,
        description: 'desc',
        createdAt: new Date(),
        analyses: [],
      };
      mockPrisma.product.findUnique.mockResolvedValue(product);

      await service.findOne('prod-1', 'user-1');

      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1', userId: 'user-1' },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        select: expect.objectContaining({
          id: true,
          name: true,
          url: true,
          description: true,
          createdAt: true,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          analyses: expect.any(Object),
        }),
      });
    });

    it('returns latestAnalysis as the first analysis when analyses exist', async () => {
      const analysis = {
        id: 'ana-1',
        summary: 'summary',
        targetAudience: 'devs',
        strategies: [],
        plan: [],
        createdAt: new Date(),
      };
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'My App',
        url: null,
        description: 'desc',
        createdAt: new Date(),
        analyses: [analysis],
      });

      const result = await service.findOne('prod-1', 'user-1');

      expect(result.latestAnalysis).toEqual(analysis);
      expect(result).not.toHaveProperty('analyses');
    });

    it('returns latestAnalysis as null when no analyses exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'My App',
        url: null,
        description: 'desc',
        createdAt: new Date(),
        analyses: [],
      });

      const result = await service.findOne('prod-1', 'user-1');

      expect(result.latestAnalysis).toBeNull();
    });

    it('strips the analyses array from the returned object', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'My App',
        url: null,
        description: 'desc',
        createdAt: new Date(),
        analyses: [],
      });

      const result = await service.findOne('prod-1', 'user-1');

      expect(result).not.toHaveProperty('analyses');
    });
  });
});
