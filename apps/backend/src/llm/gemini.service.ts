import { GoogleGenAI } from '@google/genai';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeminiService {
  private client: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('Gemini API key not configured');
    }
    this.client = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: 30_000 },
    });
  }

  getClient(): GoogleGenAI {
    return this.client;
  }
}
