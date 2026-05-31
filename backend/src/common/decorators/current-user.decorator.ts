import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/** Extracts the authenticated user from the request.
 *  Use after @UseGuards(JwtAuthGuard).
 *  @example
 *    @Get('me')
 *    @UseGuards(JwtAuthGuard)
 *    getMe(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
