import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnalysisService } from './analysis.service';

@Controller('products')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post(':id/analyze')
  @HttpCode(HttpStatus.CREATED)
  analyze(@Param('id') id: string) {
    return this.analysisService.create(id);
  }

  @Get(':id/analyses')
  findAll(@Param('id') id: string) {
    return this.analysisService.findByProduct(id);
  }
}
