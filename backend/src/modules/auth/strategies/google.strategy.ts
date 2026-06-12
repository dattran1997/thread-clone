import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  private readonly configured: boolean;

  constructor(
    private config: ConfigService,
    private authService: AuthService,
  ) {
    // Use placeholder values if credentials aren't set so the app still starts.
    // Google login will return a 501 at runtime until real credentials are added.
    const clientID = config.get<string>("GOOGLE_CLIENT_ID") || "GOOGLE_CLIENT_ID_NOT_CONFIGURED";
    const clientSecret = config.get<string>("GOOGLE_CLIENT_SECRET") || "GOOGLE_SECRET_NOT_CONFIGURED";

    super({
      clientID,
      clientSecret,
      callbackURL: `${config.get<string>("BACKEND_URL") ?? "http://localhost:3001"}/api/v1/auth/google/callback`,
      scope: ["email", "profile"],
    });

    this.configured = Boolean(
      config.get<string>("GOOGLE_CLIENT_ID") && config.get<string>("GOOGLE_CLIENT_SECRET"),
    );

    if (!this.configured) {
      console.warn("[AUTH] Google OAuth is disabled — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable it");
    }
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      emails?: Array<{ value: string }>;
      displayName: string;
      photos?: Array<{ value: string }>;
    },
    done: VerifyCallback,
  ) {
    if (!this.configured) {
      return done(new Error("Google OAuth is not configured on this server"), undefined);
    }

    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error("No email from Google"), undefined);

    try {
      const result = await this.authService.findOrCreateOAuthUser({
        googleId: profile.id,
        email,
        displayName: profile.displayName,
        avatarUrl: profile.photos?.[0]?.value,
      });
      done(null, result);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
