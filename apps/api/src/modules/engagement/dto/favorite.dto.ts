import { IsUUID } from "class-validator";

export class FavoriteDto {
  @IsUUID()
  workId!: string;
}
