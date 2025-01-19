import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module.ts";
import { HonoAdapter, NestHonoApplication } from "@asla/nest-hono-adapter";

async function bootstrap() {
  const app = await NestFactory.create<NestHonoApplication>(AppModule, new HonoAdapter());

  await app.listen(3000, "0.0.0.0");
  console.log("ok");
  
}
bootstrap();
