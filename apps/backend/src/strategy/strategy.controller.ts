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
import {
  toSelectedStrategyResponse,
  toStrategyListResponse,
} from './dto/strategy.response';
import { StrategyService } from './strategy.service';

@Controller('products/:productId/strategies')
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}

  @Get()
  async list(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const result = await this.strategyService.listForProduct(
      productId,
      user.sub,
    );
    return toStrategyListResponse(result.strategies, result.hasAnyTemplate);
  }

  @Get('template')
  async getTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const result = await this.strategyService.getSelectedTemplate(
      productId,
      user.sub,
    );
    return toSelectedStrategyResponse(result.strategy, result.template);
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generate(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const result = await this.strategyService.generateCards(
      productId,
      user.sub,
    );
    return toStrategyListResponse(result.strategies, result.hasAnyTemplate);
  }

  @Post(':strategyId/select')
  @HttpCode(HttpStatus.CREATED)
  async select(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('strategyId', ParseUUIDPipe) strategyId: string,
  ) {
    const result = await this.strategyService.selectStrategy(
      productId,
      strategyId,
      user.sub,
    );
    return toSelectedStrategyResponse(result.strategy, result.template);
  }
}
