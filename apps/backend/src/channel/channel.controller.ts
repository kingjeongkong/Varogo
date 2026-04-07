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
import { ChannelService } from './channel.service';

@Controller('products/:productId/channels')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.CREATED)
  analyze(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.channelService.analyze(productId, user.sub);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.channelService.findByProduct(productId, user.sub);
  }

  @Get(':channelId')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.channelService.findOne(channelId, user.sub);
  }
}
