import { createNestHono } from "./__mocks__/create.ts";
import { Controller, Get, Header, HttpCode, Module, Redirect } from "@nestjs/common";
import { expect, test } from "vitest";

test("内部错误", async function () {
  @Controller()
  class TestController {
    @Get("status500")
    getError() {
      throw new Error("error");
    }
  }

  @Module({ controllers: [TestController] })
  class AppModule {}
  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/status500");
  expect(res.status).toBe(500);
});

test("请求未设定的路由，应返回404", async function () {
  @Controller()
  class TestController {}
  @Module({ controllers: [TestController] })
  class AppModule {}
  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/aaaaaaaaaa");
  expect(res.status).toBe(404);
});
test("使用 @Redirect() 重定向", async function () {
  @Controller()
  class TestController {
    @Redirect("http://www.abc.com")
    @Get("redirect")
    redirect() {
      return 1;
    }
  }
  @Module({ controllers: [TestController] })
  class AppModule {}
  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/redirect", { redirect: "manual" });
  expect(res.status).toBe(302);
  expect(res.headers.get("location")).toBe("http://www.abc.com");
});
test("使用 @HttpCode() 设定响应状态码", async function () {
  @Controller()
  class TestController {
    @HttpCode(202)
    @Get("statusCode")
    statusCode() {}
  }
  @Module({ controllers: [TestController] })
  class AppModule {}

  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/statusCode");
  expect(res.status).toBe(202);
});
test("使用 @Header() 设定响应头", async function () {
  @Controller()
  class TestController {
    @Header("abc", "123")
    @Get("header")
    header() {}
  }

  @Module({ controllers: [TestController] })
  class AppModule {}
  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/header");
  expect(res.headers.get("abc")).toBe("123");
});
