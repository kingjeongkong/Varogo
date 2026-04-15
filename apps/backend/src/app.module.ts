import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { LlmModule } from './llm/llm.module';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './product/product.module';
import { StrategyModule } from './strategy/strategy.module';
import { ContentModule } from './content/content.module';
import { ThreadsModule } from './threads/threads.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    LlmModule,
    AuthModule,
    ProductModule,
    StrategyModule,
    ContentModule,
    ThreadsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
