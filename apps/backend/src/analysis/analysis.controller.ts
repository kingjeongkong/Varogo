import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';

@Controller('products')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post(':id/analyze')
  @HttpCode(HttpStatus.CREATED)
  analyze(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.analysisService.create(id, user.sub);
  }

  @Get(':id/analyses')
  findAll(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.analysisService.findByProduct(id, user.sub);
  }
}
