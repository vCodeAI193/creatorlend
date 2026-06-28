import { IsBoolean, IsOptional, IsUUID } from "class-validator";

export class ExchangeDto {
  @IsUUID()
  newWorkId!: string;

  /** Ob der Tausch gegen das Kontingent angerechnet wird (B-078, Default: false). */
  @IsBoolean()
  @IsOptional()
  countsAgainstQuota?: boolean;
}
