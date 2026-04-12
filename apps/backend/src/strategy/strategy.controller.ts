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
import { StrategyService } from './strategy.service';

@Controller('products/:productId/channels/:channelId/strategies')
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}

  @Get()
  async list(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.strategyService.listForChannel(productId, channelId, user.sub);
  }

  @Get('template')
  async getTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.strategyService.getSelectedTemplate(
      productId,
      channelId,
      user.sub,
    );
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generate(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.strategyService.generateCards(productId, channelId, user.sub);
  }

  @Post(':strategyId/select')
  @HttpCode(HttpStatus.CREATED)
  async select(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('strategyId', ParseUUIDPipe) strategyId: string,
  ) {
    return this.strategyService.selectStrategy(
      productId,
      channelId,
      strategyId,
      user.sub,
    );
  }
}
