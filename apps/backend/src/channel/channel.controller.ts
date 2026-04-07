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
import { toChannelRecommendationResponse } from './dto/channel.response';

@Controller('products/:productId/channels')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.CREATED)
  async analyze(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const recommendations = await this.channelService.analyze(
      productId,
      user.sub,
    );
    return recommendations.map((r) => toChannelRecommendationResponse(r));
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const recommendations = await this.channelService.findByProduct(
      productId,
      user.sub,
    );
    return recommendations.map((r) => toChannelRecommendationResponse(r));
  }

  @Get(':channelId')
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    const recommendation = await this.channelService.findOne(
      channelId,
      user.sub,
    );
    return toChannelRecommendationResponse(recommendation);
  }
}
