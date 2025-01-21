import { createNestHono } from "./__mocks__/create.ts";
import { GetParamModule } from "./modules/get_param.module.ts";
import { HonoAdapter, NestHonoApplication } from "nest-hono-adapter";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/hello_word.module.ts";
import { assertEquals } from "@std/assert";

import { Hono } from "hono";
import { Server } from "node:http";

Deno.test("listen fake http server", async function () {
  const hono = new Hono();
  const app = await NestFactory.create<NestHonoApplication>(AppModule, new HonoAdapter({ hono }));

  await app.listen(3000, "127.0.0.1");
  const res = await hono.request("/hi");
  assertEquals(res.status, 200);
  const text = await res.text();
  assertEquals(text, "hello word");
});

Deno.test("custom http server", async () => {
  const server = new Server();

  const adapter = new HonoAdapter({
    initHttpServer({ forceCloseConnections, httpsOptions }) {
      return server;
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  });
  const app = await NestFactory.create<NestHonoApplication>(AppModule, adapter);
  try {
    await app.listen(3000, "127.0.0.1");
    assertEquals(server.listening, true, "http server is listening");
    await app.close();
    assertEquals(server.listening, false, "http server is closed");
  } finally {
    server.close();
  }
});

//TODO
Deno.test("use", { ignore: true }, async () => {
  const { adapter, app, hono } = await createNestHono(GetParamModule);
});
Deno.test("enableCros", { ignore: true }, async () => {
  const { adapter, app, hono } = await createNestHono(GetParamModule);
});
Deno.test("useBodyParser", { ignore: true }, async () => {
  const { adapter, app, hono } = await createNestHono(GetParamModule);
});
Deno.test("useWebSocketAdapter", { ignore: true }, async () => {
  const { adapter, app, hono } = await createNestHono(GetParamModule);
});
