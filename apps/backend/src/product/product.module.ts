import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductAnalysisService } from './product-analysis.service';

@Module({
  controllers: [ProductController],
  providers: [ProductService, ProductAnalysisService],
})
export class ProductModule {}
