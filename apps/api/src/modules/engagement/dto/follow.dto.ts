import { IsUUID } from "class-validator";

export class FollowDto {
  @IsUUID()
  artistId!: string;
}
