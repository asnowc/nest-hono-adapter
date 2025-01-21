import { createNestHono } from "./__mocks__/create.ts";
import { expect } from "@std/expect";
import { assertEquals } from "@std/assert";
import { Controller, Get, Module, Req, Res } from "@nestjs/common";
import type { HonoResponse } from "nest-hono-adapter";
import type { HonoRequest } from "hono";

Deno.test("使用 @Req() 获取请求", async function () {
  @Controller()
  class ExampleController {
    @Get("req")
    req(@Req() req: HonoRequest) {
      return {
        query: req.query(),
        params: req.param(),
        headers: req.header("abc"),
      };
    }
  }

  @Module({ controllers: [ExampleController] })
  class AppModule {}

  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/req");
  expect(res.status).toBe(200);
  const data = await res.json();
  assertEquals(data, { query: {}, params: {} });
});
Deno.test("使用 @Res() 获取响应", async function () {
  @Controller()
  class ExampleController {
    @Get("res")
    res(@Res() res: HonoResponse) {
      res.send(res.text("/res"));
    }
  }

  @Module({ controllers: [ExampleController] })
  class AppModule {}

  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/res");
  expect(res.status).toBe(200);
  const data = await res.text();
  assertEquals(data, "/res");
});
Deno.test("使用 @Res() 获取响应, 但函数返回前未调用 send(), 将响应空的 body", async function () {
  @Controller()
  class ExampleController {
    @Get("resNoSend")
    resNoSend(@Res() res: HonoResponse) {}
  }

  @Module({ controllers: [ExampleController] })
  class AppModule {}

  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/resNoSend");
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("");
});
