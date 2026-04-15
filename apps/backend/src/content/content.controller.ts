import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { ContentService } from './content.service';
import { toContentResponse } from './dto/content.response';

@Controller('products/:productId/strategies/:strategyId/content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  async getContent(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('strategyId', ParseUUIDPipe) strategyId: string,
  ) {
    const content = await this.contentService.getContent(
      productId,
      strategyId,
      user.sub,
    );
    return toContentResponse(content);
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generateContent(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('strategyId', ParseUUIDPipe) strategyId: string,
  ) {
    const content = await this.contentService.generateContent(
      productId,
      strategyId,
      user.sub,
    );
    return toContentResponse(content);
  }
}
