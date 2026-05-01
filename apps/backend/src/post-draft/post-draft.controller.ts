import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { CreatePostDraftDto } from './dto/create-post-draft.dto';
import { ListPostDraftsQueryDto } from './dto/list-post-drafts.query.dto';
import { PublishPostDraftDto } from './dto/publish-post-draft.dto';
import { UpdatePostDraftDto } from './dto/update-post-draft.dto';
import { toPostDraftResponse } from './dto/post-draft.response';
import { PostDraftService } from './post-draft.service';

@Controller('post-drafts')
export class PostDraftController {
  constructor(private readonly postDraftService: PostDraftService) {}

  @Get()
  async list(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListPostDraftsQueryDto,
  ) {
    return this.postDraftService.list(user.sub, query);
  }

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePostDraftDto,
  ) {
    const { draft, evaluationFeedback } = await this.postDraftService.create(
      user.sub,
      dto,
    );
    return toPostDraftResponse(draft, { evaluationFeedback });
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const draft = await this.postDraftService.findOneByUser(id, user.sub);
    return toPostDraftResponse(draft);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDraftDto,
  ) {
    const draft = await this.postDraftService.update(id, user.sub, dto);
    return toPostDraftResponse(draft);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishPostDraftDto,
  ) {
    const draft = await this.postDraftService.publish(id, user.sub, dto);
    return toPostDraftResponse(draft);
  }
}
