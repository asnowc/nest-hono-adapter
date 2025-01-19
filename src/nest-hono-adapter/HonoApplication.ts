import { INestApplication } from "@nestjs/common";
import { ServerType } from "@hono/node-server";
import { HonoApplicationExtra } from "./hono.impl.ts";
import { HonoAdapter } from "./adapter.ts";

export interface NestHonoApplication<TServer extends ServerType = ServerType>
  extends INestApplication<TServer>,
    HonoApplicationExtra {
  getHttpAdapter(): HonoAdapter;
}
