import { Injectable, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";

export const IS_PUBLIC_KEY = "isPublic";

/** Protects routes with JWT. Add @Public() to skip.
 *
 * Public routes still attempt soft-authentication: if the request carries a valid
 * JWT the user is populated on req.user (enabling viewer-aware queries), but the
 * request is never rejected for a missing or invalid token.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // Run Passport JWT extraction but swallow errors — always allow through.
      const result = super.canActivate(context);
      if (result instanceof Promise) return (result as Promise<boolean>).catch(() => true);
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: TUser, _info: any, context: ExecutionContext): TUser {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Public routes: return whoever authenticated (or null) — never throw.
    if (isPublic) return (user ?? null) as TUser;
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException();
    }
    return user;
  }
}
