import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HookGenerationService } from './hook-generation.service';
import { PostDraftController } from './post-draft.controller';
import { PostDraftService } from './post-draft.service';

@Module({
  imports: [PrismaModule],
  controllers: [PostDraftController],
  providers: [PostDraftService, HookGenerationService],
})
export class PostDraftModule {}
