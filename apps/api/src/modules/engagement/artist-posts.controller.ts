import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@creatorlend/shared';
import { CurrentUser } from '../../common/current-user.decorator';
import { ArtistPostsService } from './artist-posts.service';

@Controller('posts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ArtistPostsController {
  constructor(private readonly posts: ArtistPostsService) {}

  @Post()
  @Roles(UserRole.ARTIST)
  create(@CurrentUser() userId: string, @Body() body: { title: string; body: string; imageUrl?: string; linkUrl?: string; scheduledAt?: string }) {
    return this.posts.create(userId, body);
  }

  @Get('artist/:artistId')
  list(@Param('artistId') artistId: string) {
    return this.posts.list(artistId);
  }

  @Get('feed')
  feed(@CurrentUser() userId: string) {
    return this.posts.feedForFollower(userId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.posts.get(id);
  }

  @Delete(':id')
  @Roles(UserRole.ARTIST)
  delete(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.posts.delete(userId, id);
  }

  @Post(':id/reactions')
  react(@CurrentUser() userId: string, @Param('id') postId: string, @Body() body: { emoji?: string }) {
    return this.posts.react(userId, postId, body.emoji);
  }

  @Delete(':id/reactions')
  unreact(@CurrentUser() userId: string, @Param('id') postId: string) {
    return this.posts.unreact(userId, postId);
  }

  @Post(':id/comments')
  comment(@CurrentUser() userId: string, @Param('id') postId: string, @Body() body: { body: string }) {
    return this.posts.comment(userId, postId, body.body);
  }

  // PATCH /api/v1/posts/:id/pin – Beitrag anpinnen (F-615)
  @Patch(':id/pin')
  @Roles(UserRole.ARTIST)
  pin(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.posts.pinPost(userId, id);
  }

  // PATCH /api/v1/posts/:id/unpin – Pin entfernen (F-615)
  @Patch(':id/unpin')
  @Roles(UserRole.ARTIST)
  unpin(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.posts.unpinPost(userId, id);
  }

  // POST /api/v1/posts/newsletter – Newsletter an Follower senden (F-443)
  @Post('newsletter')
  @Roles(UserRole.ARTIST)
  sendNewsletter(
    @CurrentUser() userId: string,
    @Body('subject') subject: string,
    @Body('body') body: string,
  ) {
    return this.posts.sendNewsletterToFollowers(userId, subject, body);
  }
}
