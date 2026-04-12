import { Module } from '@nestjs/common';
import { ChannelModule } from '../channel/channel.module';
import { StrategyController } from './strategy.controller';
import { StrategyGenerationService } from './strategy-generation.service';
import { StrategyService } from './strategy.service';

@Module({
  imports: [ChannelModule],
  controllers: [StrategyController],
  providers: [StrategyService, StrategyGenerationService],
})
export class StrategyModule {}
