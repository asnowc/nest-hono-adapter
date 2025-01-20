import { NestFactory } from "@nestjs/core";
import { ExpressAdapter, NestExpressApplication } from "@nestjs/platform-express";
import { Module } from "@nestjs/common";
import { GetParamModule } from "../__mocks__/get_param.module.ts";
import { OnlyGetReqAndResModule } from "../__mocks__/get_request_response.module.ts";
import { ResponseModule } from "../__mocks__/response.module.ts";

@Module({
  imports: [GetParamModule, OnlyGetReqAndResModule, ResponseModule],
})
class AppModule {
  constructor() {}
}
async function bootstrap() {
  const adapter = new ExpressAdapter();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, adapter);

  await app.listen(3000, "0.0.0.0");
  console.log("ok");
}
bootstrap();
