import { IsUUID } from "class-validator";

export class BorrowDto {
  @IsUUID()
  workId!: string;
}
