import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAiService {
  private client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('OpenAI API key not configured');
    }
    this.client = new OpenAI({
      apiKey,
      timeout: 30_000,
      maxRetries: 0,
    });
  }

  getClient(): OpenAI {
    return this.client;
  }
}
