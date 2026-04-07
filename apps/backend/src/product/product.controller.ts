import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import {
  toProductResponse,
  toProductWithAnalysisResponse,
} from './dto/product.response';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProductDto) {
    const product = await this.productService.create(user.sub, dto);
    return toProductWithAnalysisResponse(product);
  }

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    const products = await this.productService.findAllByUser(user.sub);
    return products.map((p) => toProductResponse(p));
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const product = await this.productService.findOneByUser(id, user.sub);
    return toProductWithAnalysisResponse(product);
  }
}
