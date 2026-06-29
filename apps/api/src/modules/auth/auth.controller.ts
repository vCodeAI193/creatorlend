import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // POST /api/v1/auth/register
  @Post("register")
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  // POST /api/v1/auth/login – mit Rate-Limiting (B-009)
  @Post("login")
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  // POST /api/v1/auth/refresh – Token-Rotation (B-001)
  @Post("refresh")
  @HttpCode(200)
  refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken);
  }

  // POST /api/v1/auth/logout
  @Post("logout")
  @HttpCode(200)
  logout(@Body() body: RefreshDto) {
    return this.auth.logout(body.refreshToken);
  }

  // POST /api/v1/auth/verify-email (B-002)
  @Post("verify-email")
  @HttpCode(200)
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.auth.verifyEmail(body.token);
  }

  // POST /api/v1/auth/forgot-password – mit Rate-Limiting (B-003/B-009)
  @Post("forgot-password")
  @HttpCode(202)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(body.email);
  }

  // POST /api/v1/auth/reset-password (B-003)
  @Post("reset-password")
  @HttpCode(200)
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(body.token, body.newPassword);
  }

  // POST /api/v1/auth/magic/send – Magic-Link senden (F-014)
  @Post("magic/send")
  @HttpCode(200)
  magicSend(@Body("email") email: string) {
    return this.auth.sendMagicLink(email);
  }

  // POST /api/v1/auth/magic/verify – Magic-Link verifizieren (F-014)
  @Post("magic/verify")
  @HttpCode(200)
  magicVerify(@Body("token") token: string) {
    return this.auth.verifyMagicLink(token);
  }
}
