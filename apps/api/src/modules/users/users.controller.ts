import { Controller, Get, Req } from "@nestjs/common";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // GET /api/v1/users/me – eigenes Profil
  @Get("me")
  me(@Req() req: { userId: string }) {
    return this.users.getProfile(req.userId);
  }
}
