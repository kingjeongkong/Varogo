import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { VoiceProfileService } from './voice-profile.service';
import { toVoiceProfileResponse } from './dto/voice-profile.response';

@Controller('voice-profile')
export class VoiceProfileController {
  constructor(private readonly voiceProfileService: VoiceProfileService) {}

  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  async importFromThreads(@CurrentUser() user: JwtPayload) {
    const profile = await this.voiceProfileService.importFromThreads(user.sub);
    return toVoiceProfileResponse(profile);
  }

  @Get()
  async findOne(@CurrentUser() user: JwtPayload) {
    const profile = await this.voiceProfileService.findOne(user.sub);
    return profile ? toVoiceProfileResponse(profile) : null;
  }
}
