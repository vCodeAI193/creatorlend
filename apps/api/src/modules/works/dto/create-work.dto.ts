import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { WorkType } from "@creatorlend/shared";

export class CreateWorkDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsEnum(WorkType)
  type!: WorkType;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsInt()
  @Min(0)
  loanPriceCents!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  explicit?: boolean;

  @IsOptional()
  @IsDateString()
  publishAt?: string;
}
