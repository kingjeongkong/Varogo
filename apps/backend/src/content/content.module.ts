import { Module } from '@nestjs/common';
import { ChannelModule } from '../channel/channel.module';
import { ContentController } from './content.controller';
import { ContentGenerationService } from './content-generation.service';
import { ContentService } from './content.service';

@Module({
  imports: [ChannelModule],
  controllers: [ContentController],
  providers: [ContentService, ContentGenerationService],
})
export class ContentModule {}
