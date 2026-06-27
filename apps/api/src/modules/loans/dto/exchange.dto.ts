import { IsUUID } from "class-validator";

export class ExchangeDto {
  @IsUUID()
  newWorkId!: string;
}
