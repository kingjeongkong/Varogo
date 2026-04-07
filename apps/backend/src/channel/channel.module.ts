import { Module } from '@nestjs/common';
import { ProductModule } from '../product/product.module';
import { ChannelAnalysisService } from './channel-analysis.service';
import { ChannelController } from './channel.controller';
import { ChannelService } from './channel.service';

@Module({
  imports: [ProductModule],
  controllers: [ChannelController],
  providers: [ChannelService, ChannelAnalysisService],
})
export class ChannelModule {}
