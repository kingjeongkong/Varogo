import { Global, Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { OpenAiService } from './openai.service';

@Global()
@Module({
  providers: [GeminiService, OpenAiService],
  exports: [GeminiService, OpenAiService],
})
export class LlmModule {}
