import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // POST /api/v1/auth/register
  @Post("register")
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  // POST /api/v1/auth/login
  @Post("login")
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }
}
