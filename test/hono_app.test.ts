import { HonoAdapter, NestHonoApplication } from "nest-hono-adapter";
import { NestFactory } from "@nestjs/core";
import { expect, test } from "vitest";

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

test("listen fake http server", async function () {
  const hono = new Hono();
  const app = await NestFactory.create<NestHonoApplication>(AppModule, new HonoAdapter({ hono }), { logger: false });

  await app.listen(3000, "127.0.0.1");
  const res = await hono.request("/hi");
  expect(res.status).toBe(200);
  const text = await res.text();
  expect(text).toBe("hello word");
});

test("custom http server", async () => {
  const server = new Server();

  const adapter = new HonoAdapter({
    initHttpServer({ forceCloseConnections, httpsOptions }) {
      return server;
    },
  });
  const app = await NestFactory.create<NestHonoApplication>(AppModule, adapter, { logger: false });
  try {
    await app.listen(3000, "127.0.0.1");
    expect(server.listening, "http server is listening").toBe(true);
    await app.close();
    expect(server.listening, "http server is closed").toBe(false);
  } finally {
    server.close();
  }
});

test.runIf(globalThis.Deno)("Deno.serve", async () => {
  let serve: Deno.HttpServer<Deno.NetAddr> | undefined;
  const adapter = new HonoAdapter({
    close: () => serve!.shutdown(),
    address: () => serve!.addr.hostname,
    listen({ port, hostname, hono, httpsOptions = {}, forceCloseConnections }) {
      return new Promise<void>((resolve) => {
        serve = Deno.serve(
          {
            onListen: () => resolve(),
            port,
            hostname,
            key: httpsOptions.key,
            cert: httpsOptions.cert,
          },
          hono.fetch,
        );
      });
    },
  });
  const app = await NestFactory.create<NestHonoApplication>(AppModule, adapter, { logger: false });
  try {
    await app.listen(3000, "127.0.0.1");
    expect(serve).not.toBeUndefined();
    expect(serve?.addr.hostname).toBe("127.0.0.1");
    await app.close();
    await serve?.finished;
  } finally {
    serve?.shutdown();
  }
});
