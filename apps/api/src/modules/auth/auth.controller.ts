import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Request, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "../../common/current-user.decorator";
import { OAuthServerService } from "./oauth-server.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly oauthServer: OAuthServerService,
  ) {}

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
  login(@Body() body: LoginDto, @Request() req: any) {
    return this.auth.login(body.email, body.password, req.ip, req.headers?.['user-agent']);
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

  // GET /api/v1/auth/oauth/authorize – OAuth2 Authorization Code (F-877)
  @Get("oauth/authorize")
  oauthAuthorize(
    @Query("client_id") clientId: string,
    @Query("redirect_uri") redirectUri: string,
    @Query("scope") scope: string,
    @Query("user_id") userId: string,
  ) {
    return this.oauthServer.authorize(clientId, redirectUri, scope, userId);
  }

  // POST /api/v1/auth/oauth/token – OAuth2 Token Exchange (F-877)
  @Post("oauth/token")
  @HttpCode(200)
  oauthToken(@Body("code") code: string) {
    return this.oauthServer.token(code);
  }

  // GET /api/v1/auth/sessions
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  getSessions(@CurrentUser() userId: string) {
    return this.auth.getSessions(userId);
  }

  // DELETE /api/v1/auth/sessions/:id
  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  revokeSession(@CurrentUser() userId: string, @Param('id') sessionId: string) {
    return this.auth.revokeSession(userId, sessionId);
  }

  // DELETE /api/v1/auth/sessions
  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  revokeAllSessions(@CurrentUser() userId: string) {
    return this.auth.revokeAllSessions(userId);
  }

  // GET /api/v1/auth/login-history
  @Get('login-history')
  @UseGuards(JwtAuthGuard)
  getLoginHistory(@CurrentUser() userId: string) {
    return this.auth.getLoginHistory(userId);
  }

  // F-001: Passkey / WebAuthn – Registration Challenge
  @Post('passkey/register/challenge')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  passkeyRegChallenge(@CurrentUser() userId: string) {
    return this.auth.passkeyRegistrationChallenge(userId);
  }

  // F-001: Passkey / WebAuthn – Registration Verify
  @Post('passkey/register/verify')
  @UseGuards(JwtAuthGuard)
  passkeyRegVerify(@CurrentUser() userId: string, @Body() credential: Record<string, unknown>) {
    return this.auth.passkeyRegistrationVerify(userId, credential);
  }

  // F-001: Passkey / WebAuthn – Authentication Challenge
  @Post('passkey/authenticate/challenge')
  @HttpCode(200)
  passkeyAuthChallenge() {
    return this.auth.passkeyAuthenticationChallenge();
  }

  // F-001: Passkey / WebAuthn – Authentication Verify
  @Post('passkey/authenticate/verify')
  @HttpCode(200)
  passkeyAuthVerify(@Body() credential: Record<string, unknown>) {
    return this.auth.passkeyAuthenticationVerify(credential);
  }
}
