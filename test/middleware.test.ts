import { createNestHono } from "./__mocks__/create.ts";
import { Controller, Get, Module, NestModule, Req, RequestMethod } from "@nestjs/common";
import { expect, test } from "vitest";
import type { Context } from "hono";
import type { MiddlewareConsumer } from "@nestjs/common";
test("global use", async function () {
  @Module({})
  class AppModule {}
  const { hono, app } = await createNestHono(AppModule);
  app.use(async function (ctx: Context, next) {
    return ctx.text("1234");
  });
  const res = await hono.request("/abc");
  expect(res.status).toBe(200);
  await expect(res.text()).resolves.toBe("1234");
});

@Controller()
class TestController {
  @Get("/test")
  r1(@Req() req: Context) {
    return req.get("var") ?? "0";
  }
  @Get("/test2")
  r2(@Req() req: Context) {
    return req.get("var") ?? "0";
  }
}

test("module use", async function () {
  @Module({ controllers: [TestController] })
  class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
      consumer.apply(async function (req: Context, res: Context, next: () => void) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        req.set("var", "123");
        next();
      }).forRoutes({ method: RequestMethod.GET, path: "/test" });

      consumer.apply(function (req: Context, res: Context, next: () => void) {
        req.set("var", "321");
        next();
      }).forRoutes({ method: RequestMethod.GET, path: "/" });
    }
  }
  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/test");
  expect(res.status).toBe(200);
  await expect(res.text()).resolves.toBe("123");

  const res2 = await hono.request("/test2");
  await expect(res2.text()).resolves.toBe("0");
});
test("Use all methods", async function () {
  @Module({ controllers: [TestController] })
  class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
      consumer.apply(function (req: Context, res: Context, next: Function) {
        req.set("var", "123");
        next();
      }).forRoutes("/test");
    }
  }
  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/test");
  expect(res.status).toBe(200);
  await expect(res.text()).resolves.toBe("123");
});

test("Not calling next", async function () {
  @Module({ controllers: [TestController] })
  class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
      consumer.apply(function (req: Context, res: Context, next: Function) {
        req.set("var", "123");
        return 1;
      }).forRoutes({ method: RequestMethod.GET, path: "/test" });
    }
  }
  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/test");
  expect(res.status, "Context is not finalized. Did you forget to return a Response object or `await next()`").toBe(
    500,
  );
});

//TODO
test.skip("enableCros", async () => {
});
test.skip("useBodyParser", async () => {
});
test.skip("useWebSocketAdapter", async () => {
});
