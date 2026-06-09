import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { configuration } from "./config/configuration";
import { PrismaModule } from "./prisma/prisma.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";

// Feature modules
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { HealthModule } from "./modules/health/health.module";
import { ThreadsModule } from "./modules/threads/threads.module";
import { FollowsModule } from "./modules/follows/follows.module";
import { FeedModule } from "./modules/feed/feed.module";
import { ReactionsModule } from "./modules/reactions/reactions.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SearchModule } from "./modules/search/search.module";
import { MessagesModule } from "./modules/messages/messages.module";
import { ModerationModule } from "./modules/moderation/moderation.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { MediaModule } from "./modules/media/media.module";
import { CommunitiesModule } from "./modules/communities/communities.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AdminModule } from "./modules/admin/admin.module";
import { HashtagsModule } from "./modules/hashtags/hashtags.module";

@Module({
  imports: [
    // Config — loaded first, global so all modules can inject ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ".env",
    }),

    // Database — global PrismaService available everywhere
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    HealthModule,
    ThreadsModule,
    FollowsModule,
    FeedModule,
    ReactionsModule,
    NotificationsModule,
    SearchModule,
    MessagesModule,
    ModerationModule,
    SettingsModule,
    MediaModule,
    CommunitiesModule,
    AnalyticsModule,
    AdminModule,
    HashtagsModule,
  ],
  providers: [
    // Apply JwtAuthGuard globally; use @Public() to opt out
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
