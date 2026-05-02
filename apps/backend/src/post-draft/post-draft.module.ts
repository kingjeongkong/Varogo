import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ThreadsModule } from '../threads/threads.module';
import { PostDraftController } from './post-draft.controller';
import { PostDraftOptionGenerationService } from './post-draft-option-generation.service';
import { PostDraftService } from './post-draft.service';
import { VoiceEvaluatorService } from './voice-evaluator.service';

@Module({
  imports: [PrismaModule, ThreadsModule],
  controllers: [PostDraftController],
  providers: [
    PostDraftService,
    PostDraftOptionGenerationService,
    VoiceEvaluatorService,
  ],
})
export class PostDraftModule {}
