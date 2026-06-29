import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ArtistPostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(artistId: string, input: { title: string; body: string; imageUrl?: string; linkUrl?: string; scheduledAt?: string }) {
    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
    const publishedAt = scheduledAt ? undefined : new Date();
    return this.prisma.artistPost.create({ data: { artistId, ...input, scheduledAt, publishedAt } });
  }

  async list(artistId: string) {
    return this.prisma.artistPost.findMany({
      where: { artistId, publishedAt: { not: null } },
      orderBy: { publishedAt: 'desc' },
      include: { _count: { select: { reactions: true, comments: true } } },
    });
  }

  async get(id: string) {
    const post = await this.prisma.artistPost.findUnique({
      where: { id },
      include: {
        artist: { select: { id: true, displayName: true, avatarUrl: true } },
        reactions: true,
        comments: { where: { hidden: false }, include: { user: { select: { id: true, displayName: true } } } },
      },
    });
    if (!post) throw new NotFoundException('post_not_found');
    return post;
  }

  async delete(artistId: string, id: string) {
    const post = await this.prisma.artistPost.findUnique({ where: { id } });
    if (!post || post.artistId !== artistId) throw new ForbiddenException('not_your_post');
    await this.prisma.artistPost.delete({ where: { id } });
    return { deleted: true };
  }

  async react(userId: string, postId: string, emoji = '👍') {
    return this.prisma.artistPostReaction.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId, emoji },
      update: { emoji },
    });
  }

  async unreact(userId: string, postId: string) {
    await this.prisma.artistPostReaction.deleteMany({ where: { postId, userId } });
    return { removed: true };
  }

  async comment(userId: string, postId: string, body: string) {
    return this.prisma.artistPostComment.create({ data: { postId, userId, body } });
  }

  async hideComment(adminOrArtistId: string, commentId: string) {
    return this.prisma.artistPostComment.update({ where: { id: commentId }, data: { hidden: true } });
  }

  async pinPost(artistId: string, postId: string) {
    const post = await this.prisma.artistPost.findUnique({ where: { id: postId } });
    if (!post || post.artistId !== artistId) throw new ForbiddenException('not_your_post');
    // Unpin all first
    await this.prisma.artistPost.updateMany({ where: { artistId, isPinned: true }, data: { isPinned: false } });
    return this.prisma.artistPost.update({ where: { id: postId }, data: { isPinned: true } });
  }

  async unpinPost(artistId: string, postId: string) {
    const post = await this.prisma.artistPost.findUnique({ where: { id: postId } });
    if (!post || post.artistId !== artistId) throw new ForbiddenException('not_your_post');
    return this.prisma.artistPost.update({ where: { id: postId }, data: { isPinned: false } });
  }

  async feedForFollower(followerId: string, limit = 20) {
    const follows = await this.prisma.follow.findMany({ where: { followerId }, select: { artistId: true } });
    const artistIds = follows.map(f => f.artistId);
    return this.prisma.artistPost.findMany({
      where: { artistId: { in: artistIds }, publishedAt: { not: null, lte: new Date() } },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: { artist: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
  }
}
