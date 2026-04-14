import { Module } from '@nestjs/common';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';
import { ThreadsCryptoService } from './threads-crypto.service';

@Module({
  controllers: [ThreadsController],
  providers: [ThreadsService, ThreadsCryptoService],
  exports: [ThreadsService],
})
export class ThreadsModule {}
