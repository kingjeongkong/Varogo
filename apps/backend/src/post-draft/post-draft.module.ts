import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ThreadsModule } from '../threads/threads.module';
import { HookGenerationService } from './hook-generation.service';
import { PostDraftController } from './post-draft.controller';
import { PostDraftService } from './post-draft.service';

@Module({
  imports: [PrismaModule, ThreadsModule],
  controllers: [PostDraftController],
  providers: [PostDraftService, HookGenerationService],
})
export class PostDraftModule {}
