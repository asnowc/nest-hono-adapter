import { HonoAdapter, NestHonoApplication } from "nest-hono-adapter";
import { NestFactory } from "@nestjs/core";
import { assertEquals, assertNotEquals } from "@std/assert";

import { Hono } from "hono";
import { Server } from "node:http";

import { Controller, Get, Module } from "@nestjs/common";
@Controller()
class TestController {
  @Get("hi")
  method() {
    return "hello word";
  }
}
@Module({ controllers: [TestController] })
class AppModule {}

Deno.test("listen fake http server", async function () {
  const hono = new Hono();
  const app = await NestFactory.create<NestHonoApplication>(AppModule, new HonoAdapter({ hono }), { logger: false });

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
  });
  const app = await NestFactory.create<NestHonoApplication>(AppModule, adapter, { logger: false });
  try {
    await app.listen(3000, "127.0.0.1");
    assertEquals(server.listening, true, "http server is listening");
    await app.close();
    assertEquals(server.listening, false, "http server is closed");
  } finally {
    server.close();
  }
});

Deno.test("Deno.serve", async () => {
  let serve: Deno.HttpServer<Deno.NetAddr> | undefined;
  const adapter = new HonoAdapter({
    close: () => serve!.shutdown(),
    address: () => serve!.addr.hostname,
    async listen({ port, hostname, hono, httpsOptions = {}, forceCloseConnections }) {
      serve = await Deno.serve({ port, hostname, key: httpsOptions.key, cert: httpsOptions.cert }, hono.fetch);
    },
  });
  const app = await NestFactory.create<NestHonoApplication>(AppModule, adapter, { logger: false });
  try {
    await app.listen(3000, "127.0.0.1");
    assertNotEquals(serve!, undefined);
    assertEquals(serve?.addr.hostname, "127.0.0.1");
    await app.close();
    await serve?.finished;
  } finally {
    serve?.shutdown();
  }
});

//TODO
Deno.test("use", { ignore: true }, async () => {
});
Deno.test("enableCros", { ignore: true }, async () => {
});
Deno.test("useBodyParser", { ignore: true }, async () => {
});
Deno.test("useWebSocketAdapter", { ignore: true }, async () => {
});
