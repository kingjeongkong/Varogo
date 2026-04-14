import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ThreadsService } from './threads.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { toThreadsConnectionResponse } from './dto/threads-connection.response';

@Controller('threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

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
    @Res() res: Response,
  ) {
    const redirectUrl = await this.threadsService.handleCallback(code, state);
    res.redirect(redirectUrl);
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
}
