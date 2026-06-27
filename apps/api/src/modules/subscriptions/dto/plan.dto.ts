import { IsEnum } from "class-validator";
import { SubscriptionPlan } from "@creatorlend/shared";

export class PlanDto {
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;
}
