import { INestApplication } from "@nestjs/common";
import { ServerType } from "@hono/node-server";
import { HonoApplicationExtra, HonoBodyParser } from "./hono.impl.ts";
import { HonoAdapter, CORSOptions } from "./adapter.ts";

export interface NestHonoApplication<TServer extends ServerType = ServerType>
  extends INestApplication<TServer>,
    HonoApplicationExtra {
  // getHttpAdapter(): HonoAdapter;
  /**
   * By default, `application/json`, `application/x-www-form-urlencoded`, `multipart/form-data` and `text/plain` are automatically resolved
   * You can customize the parser, for example to parse the `application/custom` request body unmapped
   * ```ts
   * const app = await NestFactory.create<NestExpressApplication>(AppModule, adapter);
   * app.useBodyParser("application/custom", async (honoRequest) => {
   *   const json = await honoRequest.json();
   *   return new Map(json);
   * });
   *
   * @Controller()
   * class Test {
   *   @Get("data")
   *   method(@Body() body: Map) {
   *     return data;
   *   }
   * }
   */
  useBodyParser(contentType: string, parser: HonoBodyParser): void;
  enableCors(options?: CORSOptions): void;
  enableCors(options: any): void;
}
