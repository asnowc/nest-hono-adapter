import { NestFactory } from "@nestjs/core";
import {
  ExpressAdapter,
  NestExpressApplication,
} from "@nestjs/platform-express";
import { AppModule } from "./hello_word.module.ts";

async function bootstrap() {
  const adapter = new ExpressAdapter();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    adapter,
  );

  await app.listen(3000, "0.0.0.0");
  console.log("ok");
}
bootstrap();
