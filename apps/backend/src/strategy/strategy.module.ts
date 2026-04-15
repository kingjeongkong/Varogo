import { Module } from '@nestjs/common';
import { StrategyController } from './strategy.controller';
import { StrategyGenerationService } from './strategy-generation.service';
import { StrategyService } from './strategy.service';

@Module({
  controllers: [StrategyController],
  providers: [StrategyService, StrategyGenerationService],
})
export class StrategyModule {}
