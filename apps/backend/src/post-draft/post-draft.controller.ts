import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { CreatePostDraftDto } from './dto/create-post-draft.dto';
import { toPostDraftResponse } from './dto/post-draft.response';
import { PostDraftService } from './post-draft.service';

@Controller('post-drafts')
export class PostDraftController {
  constructor(private readonly postDraftService: PostDraftService) {}

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePostDraftDto,
  ) {
    const draft = await this.postDraftService.create(user.sub, dto);
    return toPostDraftResponse(draft);
  }
}
