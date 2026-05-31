import { Module } from "@nestjs/common";
import { ThreadsController } from "./threads.controller";
import { UserThreadsController } from "./user-threads.controller";
import { ThreadsService } from "./threads.service";

@Module({
  controllers: [ThreadsController, UserThreadsController],
  providers: [ThreadsService],
  exports: [ThreadsService],
})
export class ThreadsModule {}
