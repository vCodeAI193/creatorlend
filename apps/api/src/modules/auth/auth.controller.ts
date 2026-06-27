import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

interface RegisterDto {
  email: string;
  password: string;
  displayName: string;
  role?: "LISTENER" | "ARTIST";
}

interface LoginDto {
  email: string;
  password: string;
}

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
