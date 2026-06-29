import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OAuthController } from "./oauth.controller";
import { OAuthService } from "./oauth.service";
import { TotpController } from "./totp.controller";
import { TotpService } from "./totp.service";
import { ApiKeysController } from "./api-keys.controller";
import { ApiKeysService } from "./api-keys.service";

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET ?? "change-me",
      signOptions: { expiresIn: "15m" },
    }),
  ],
  controllers: [AuthController, OAuthController, TotpController, ApiKeysController],
  providers: [AuthService, OAuthService, TotpService, ApiKeysService],
  exports: [AuthService, OAuthService, TotpService, ApiKeysService],
})
export class AuthModule {}
