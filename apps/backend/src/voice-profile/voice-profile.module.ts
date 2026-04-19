import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ThreadsModule } from '../threads/threads.module';
import { VoiceAnalysisService } from './voice-analysis.service';
import { VoiceProfileController } from './voice-profile.controller';
import { VoiceProfileService } from './voice-profile.service';

@Module({
  imports: [PrismaModule, ThreadsModule],
  controllers: [VoiceProfileController],
  providers: [VoiceProfileService, VoiceAnalysisService],
  exports: [VoiceProfileService],
})
export class VoiceProfileModule {}
