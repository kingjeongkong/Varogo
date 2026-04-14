import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { ThreadsService } from './threads.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { PublishThreadsDto } from './dto/publish-threads.dto';
import type { PublishThreadsResponse } from './dto/publish-threads.dto';
import { toThreadsConnectionResponse } from './dto/threads-connection.response';

@Controller('threads')
export class ThreadsController {
  private readonly logger = new Logger(ThreadsController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly threadsService: ThreadsService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
  }

  @Get('auth-url')
  getAuthUrl(@CurrentUser() user: JwtPayload) {
    const url = this.threadsService.generateAuthUrl(user.sub);
    return { url };
  }

  @Get('callback')
  @Public()
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error || !code || !state) {
      this.logger.warn(`OAuth callback failed: error=${error}`);
      return res.redirect(`${this.frontendUrl}/integrations?threads=error`);
    }

    try {
      const redirectUrl = await this.threadsService.handleCallback(code, state);
      res.redirect(redirectUrl);
    } catch (err) {
      this.logger.error('OAuth callback error', (err as Error).stack);
      res.redirect(`${this.frontendUrl}/integrations?threads=error`);
    }
  }

  @Get('connection')
  async getConnection(@CurrentUser() user: JwtPayload) {
    const connection = await this.threadsService.getConnection(user.sub);
    return toThreadsConnectionResponse(connection);
  }

  @Delete('connection')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@CurrentUser() user: JwtPayload) {
    await this.threadsService.disconnect(user.sub);
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PublishThreadsDto,
  ): Promise<PublishThreadsResponse> {
    return this.threadsService.publishToThreads(user.sub, dto.text);
  }
}
