import { Module } from "@nestjs/common";
import { ThreadsController } from "./threads.controller";
import { UserThreadsController } from "./user-threads.controller";
import { ThreadsService } from "./threads.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [ThreadsController, UserThreadsController],
  providers: [ThreadsService],
  exports: [ThreadsService],
})
export class ThreadsModule {}
