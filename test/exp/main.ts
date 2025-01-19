import { NestFactory } from "@nestjs/core";
import { ExampleModule } from "../__mocks__/module.ts";
import { ExpressAdapter, NestExpressApplication } from "@nestjs/platform-express";

async function bootstrap() {
  const adapter = new ExpressAdapter();
  const app = await NestFactory.create<NestExpressApplication>(ExampleModule, adapter);

  await app.listen(3000, "0.0.0.0");
  console.log("ok");
}
bootstrap();
