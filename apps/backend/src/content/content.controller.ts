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

@Controller('products/:productId/channels/:channelId/content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  async getContent(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.contentService.getContent(productId, channelId, user.sub);
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generateContent(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.contentService.generateContent(productId, channelId, user.sub);
  }
}
