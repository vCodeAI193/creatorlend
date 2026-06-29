import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Rezension anlegen oder aktualisieren (B-130). F-524: sets isVerifiedBuyer. */
  async upsert(userId: string, workId: string, body: string, rating?: number) {
    if (!body?.trim()) throw new BadRequestException("review_body_required");
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.status !== "PUBLISHED") throw new NotFoundException("work_not_found");

    // F-524: Check if reviewer has an active or expired loan for the work
    const verifiedLoan = await this.prisma.loan.findFirst({
      where: { userId, workId, status: { in: ["ACTIVE", "EXPIRED"] } },
    });
    const isVerifiedBuyer = !!verifiedLoan;

    return this.prisma.review.upsert({
      where: { userId_workId: { userId, workId } },
      create: { userId, workId, body, isVerifiedBuyer, ...(rating !== undefined ? { rating } : {}) },
      update: { body, isVerifiedBuyer, ...(rating !== undefined ? { rating } : {}) },
      select: {
        id: true, workId: true, userId: true, body: true, rating: true,
        isVerifiedBuyer: true, artistReply: true, artistRepliedAt: true,
        createdAt: true, updatedAt: true,
      },
    });
  }

  /** Eigene Rezension löschen. */
  async remove(userId: string, workId: string) {
    await this.prisma.review.deleteMany({ where: { userId, workId } });
    return { deleted: true };
  }

  /**
   * Alle sichtbaren Rezensionen für ein Werk.
   * F-529/F-530: Sorting (recent|helpful|top) and rating filter.
   */
  async list(workId: string, opts: { sort?: 'recent' | 'helpful' | 'top'; rating?: number } = {}) {
    let orderBy: Record<string, string> | { votes: { _count: string } };
    switch (opts.sort) {
      case 'helpful':
        orderBy = { votes: { _count: 'desc' } };
        break;
      case 'top':
        orderBy = { rating: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    return this.prisma.review.findMany({
      where: {
        workId,
        hidden: false,
        ...(opts.rating !== undefined ? { rating: opts.rating } : {}),
      },
      orderBy: orderBy as never,
      select: {
        id: true,
        workId: true,
        body: true,
        rating: true,
        isVerifiedBuyer: true,
        artistReply: true,
        artistRepliedAt: true,
        createdAt: true,
        user: { select: { id: true, displayName: true } },
        _count: { select: { votes: true } },
      },
    });
  }

  /** Alias for list() – listForWork. F-529/F-530. */
  async listForWork(workId: string, opts: { sort?: 'recent' | 'helpful' | 'top'; rating?: number } = {}) {
    return this.list(workId, opts);
  }

  /** Rezension ausblenden (B-131, Moderation). Nur ADMIN. */
  async hide(reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException("review_not_found");
    return this.prisma.review.update({ where: { id: reviewId }, data: { hidden: true } });
  }

  /** Künstler:in antwortet auf Rezension (F-601). */
  async addArtistReply(artistId: string, reviewId: string, reply: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { work: { select: { artistId: true } } },
    });
    if (!review) throw new NotFoundException("review_not_found");
    if (review.work.artistId !== artistId) throw new ForbiddenException("not_your_work");
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { artistReply: reply, artistRepliedAt: new Date() },
      select: { id: true, artistReply: true, artistRepliedAt: true },
    });
  }

  /** Bewertung einer Rezension als hilfreich/nicht hilfreich (F-602). */
  async voteReview(userId: string, reviewId: string, helpful: boolean) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException("review_not_found");
    return this.prisma.reviewVote.upsert({
      where: { reviewId_userId: { reviewId, userId } },
      create: { reviewId, userId, helpful },
      update: { helpful },
    });
  }

  /** Rezension mit Votes abrufen (F-602). */
  async getReviewWithVotes(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        votes: true,
        user: { select: { id: true, displayName: true } },
      },
    });
    if (!review) throw new NotFoundException("review_not_found");
    const helpfulCount = review.votes.filter((v) => v.helpful).length;
    const unhelpfulCount = review.votes.filter((v) => !v.helpful).length;
    return { ...review, helpfulCount, unhelpfulCount };
  }
}
