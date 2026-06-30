import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Request, UseGuards } from "@nestjs/common";
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

  // POST /api/v1/auth/register – mit Rate-Limiting (F-034)
  @Post("register")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
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

  // F-002: OAuth Google Login – redirect & callback stubs
  @Get('social/google')
  googleLogin() {
    return this.auth.socialLoginInfo('google');
  }

  @Post('social/google/callback')
  @HttpCode(200)
  googleCallback(@Body('code') code: string, @Body('state') state: string) {
    return this.auth.socialLoginCallback('google', code, state);
  }

  // F-003: OAuth Apple Login – redirect & callback stubs
  @Get('social/apple')
  appleLogin() {
    return this.auth.socialLoginInfo('apple');
  }

  @Post('social/apple/callback')
  @HttpCode(200)
  appleCallback(@Body('id_token') idToken: string, @Body('user') user?: string) {
    return this.auth.socialLoginCallback('apple', idToken, user ?? '');
  }

  // F-004: OAuth Spotify Login
  @Get('social/spotify')
  spotifyLogin() {
    return this.auth.socialSpotifyInfo();
  }

  @Post('social/spotify/callback')
  @HttpCode(200)
  spotifyCallback(@Body('code') code: string) {
    return this.auth.socialSpotifyCallback(code);
  }

  // F-006: SMS 2FA config
  @Get('2fa/sms/config')
  sms2faConfig() {
    return this.auth.getSms2faConfig();
  }

  // F-013: CAPTCHA config
  @Get('captcha/config')
  captchaConfig() {
    return this.auth.getCaptchaConfig();
  }

  // F-016: Waitlist
  @Post('waitlist')
  @HttpCode(200)
  joinWaitlist(@Body('email') email: string) {
    return this.auth.joinWaitlist(email);
  }

  @Get('waitlist/status')
  waitlistStatus(@Query('email') email: string) {
    return this.auth.getWaitlistStatus(email ?? '');
  }

  // F-017: Onboarding steps
  @Get('onboarding/steps')
  onboardingSteps() {
    return this.auth.getOnboardingSteps();
  }

  // F-022: Password history config
  @Get('password/history-config')
  passwordHistoryConfig() {
    return this.auth.getPasswordHistoryConfig();
  }

  // F-023: Password reset via SMS
  @Post('password/reset/sms')
  @HttpCode(202)
  resetPasswordViaSms(@Body('phone') phone: string) {
    return this.auth.requestSmsPasswordReset(phone ?? '');
  }

  // F-050: SSO/SAML config
  @Get('saml/config')
  samlConfig() {
    return this.auth.getSsoConfig();
  }

  // F-053: Auto-logout config
  @Get('config/auto-logout')
  autoLogoutConfig() {
    return this.auth.getAutoLogoutConfig();
  }

  // F-054: Persistent login config
  @Get('config/persistent-login')
  persistentLoginConfig() {
    return this.auth.getPersistentLoginConfig();
  }

  // F-055: Account freeze
  @Post('account/freeze')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  freezeAccount(@CurrentUser() userId: string) {
    return this.auth.freezeAccount(userId);
  }

  // F-020: E-Mail-Adresse ändern mit Re-Verifizierung
  @Post('change-email/request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(202)
  requestEmailChange(@CurrentUser() userId: string, @Body('newEmail') newEmail: string) {
    return this.auth.requestEmailChange(userId, newEmail);
  }

  @Post('change-email/verify')
  @HttpCode(200)
  verifyEmailChange(@Body('token') token: string) {
    return this.auth.verifyEmailChange(token);
  }

  // F-047: Terms of Service – aktuelle Version + Annahme
  @Get('tos')
  getTos() {
    return this.auth.getTosVersion();
  }

  @Post('tos/accept')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  acceptTos(@CurrentUser() userId: string, @Body('version') version: string) {
    return this.auth.acceptTos(userId, version);
  }

  // F-007: Backup codes for 2FA
  @Post('2fa/backup-codes/generate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  generateBackupCodes(@CurrentUser() userId: string) {
    return this.auth.generateBackupCodes(userId);
  }

  @Get('2fa/backup-codes/status')
  @UseGuards(JwtAuthGuard)
  getBackupCodesStatus(@CurrentUser() userId: string) {
    return this.auth.getBackupCodesStatus(userId);
  }

  // F-009: Device management
  @Get('devices')
  @UseGuards(JwtAuthGuard)
  getDevices(@CurrentUser() userId: string) {
    return this.auth.getDevices(userId);
  }

  // F-012: Account lockout config
  @Get('config/lockout')
  getLockoutConfig() {
    return this.auth.getLockoutConfig();
  }

  // F-015: Validate invite code for beta registration
  @Get('invite/validate')
  validateInviteCode(@Query('code') code: string) {
    return this.auth.validateInviteCode(code ?? '');
  }

  // F-018: Registration avatar upload config
  @Get('register/avatar-config')
  getRegistrationAvatarConfig() {
    return this.auth.getRegistrationAvatarUploadConfig();
  }

  // F-019: Username suggestions
  @Get('register/username-suggestions')
  getUsernameSuggestions(@Query('displayName') displayName: string) {
    return this.auth.generateUsernameSuggestions(displayName ?? '');
  }

  // F-021: Password strength config
  @Get('config/password-strength')
  getPasswordStrengthConfig() {
    return this.auth.getPasswordStrengthConfig();
  }

  // F-026: Account deactivation / reactivation
  @Post('account/deactivate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  deactivateAccount(@CurrentUser() userId: string) {
    return this.auth.deactivateAccount(userId);
  }

  @Post('account/reactivate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  reactivateAccount(@CurrentUser() userId: string) {
    return this.auth.reactivateAccount(userId);
  }

  // F-032: OAuth app management
  @Get('oauth/apps')
  @UseGuards(JwtAuthGuard)
  getOAuthApps(@CurrentUser() userId: string) {
    return this.auth.getOAuthApps(userId);
  }

  // F-033: Token scope info
  @Get('oauth/scopes')
  getTokenScopeInfo() {
    return this.auth.getTokenScopeInfo();
  }

  // F-036: DSGVO Art. 20 — portable ID export
  @Get('export/portable-id')
  @UseGuards(JwtAuthGuard)
  exportPortableId(@CurrentUser() userId: string) {
    return this.auth.exportPortableId(userId);
  }

  // F-038: Export categories
  @Get('export/categories')
  getExportCategories() {
    return this.auth.getExportCategories();
  }

  // F-039: Account merge
  @Post('account/merge/request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(202)
  requestAccountMerge(
    @CurrentUser() userId: string,
    @Body('secondaryEmail') secondaryEmail: string,
  ) {
    return this.auth.requestAccountMerge(userId, secondaryEmail);
  }

  // F-040: Emergency contact
  @Post('account/emergency-contact')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  setEmergencyContact(@CurrentUser() userId: string, @Body('email') email: string) {
    return this.auth.setEmergencyContact(userId, email);
  }

  @Get('account/emergency-contact')
  @UseGuards(JwtAuthGuard)
  getEmergencyContact(@CurrentUser() userId: string) {
    return this.auth.getEmergencyContact(userId);
  }

  // F-045: Accessibility profile
  @Get('accessibility')
  @UseGuards(JwtAuthGuard)
  getAccessibilityProfile(@CurrentUser() userId: string) {
    return this.auth.getAccessibilityProfile(userId);
  }

  @Put('accessibility')
  @UseGuards(JwtAuthGuard)
  setAccessibilityProfile(@CurrentUser() userId: string, @Body() profile: Record<string, unknown>) {
    return this.auth.setAccessibilityProfile(userId, profile);
  }

  // F-046: Cookie consent
  @Get('cookie-consent')
  @UseGuards(JwtAuthGuard)
  getCookieConsent(@CurrentUser() userId: string) {
    return this.auth.getCookieConsent(userId);
  }

  @Post('cookie-consent')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  setCookieConsent(@CurrentUser() userId: string, @Body() consent: Record<string, unknown>) {
    return this.auth.setCookieConsent(userId, consent);
  }

  // F-048: Privacy policy versions
  @Get('privacy-policy/versions')
  getPrivacyPolicyVersions() {
    return this.auth.getPrivacyPolicyVersions();
  }

  // F-049: Account transfer
  @Post('account/transfer/request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(202)
  requestAccountTransfer(@CurrentUser() userId: string, @Body('newEmail') newEmail: string) {
    return this.auth.requestAccountTransfer(userId, newEmail);
  }

  // F-056: Blockchain identity verification
  @Get('verify/blockchain')
  getBlockchainVerificationInfo() {
    return this.auth.getBlockchainVerificationInfo();
  }

  // F-057: Emergency admin recovery info
  @Get('emergency-recovery/info')
  getEmergencyRecoveryInfo() {
    return this.auth.getEmergencyRecoveryInfo();
  }

  // F-058: ZKP age verification info
  @Get('verify/age-zkp')
  getZkpAgeVerificationInfo() {
    return this.auth.getZkpAgeVerificationInfo();
  }

  // F-061: Account import info
  @Get('import/info')
  getAccountImportInfo() {
    return this.auth.getAccountImportInfo();
  }

  // F-070: NFC profile tag
  @Get('profile/nfc')
  @UseGuards(JwtAuthGuard)
  getNfcProfileInfo(@CurrentUser() userId: string) {
    return this.auth.getNfcProfileInfo(userId);
  }

  // F-076: Analytics tracking opt-out
  @Post('tracking/opt-out')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  setTrackingOptOut(@CurrentUser() userId: string, @Body('optOut') optOut: boolean) {
    return this.auth.setTrackingOptOut(userId, !!optOut);
  }

  @Get('tracking/opt-out')
  @UseGuards(JwtAuthGuard)
  getTrackingOptOut(@CurrentUser() userId: string) {
    return this.auth.getTrackingOptOut(userId);
  }

  // F-078: Consent management
  @Get('consent/record')
  @UseGuards(JwtAuthGuard)
  getConsentRecord(@CurrentUser() userId: string) {
    return this.auth.getConsentRecord(userId);
  }
}
