import { createNestHono } from "./__mocks__/create.ts";
import { expect } from "@std/expect";
import { Controller, Get, Header, Module } from "@nestjs/common";
Deno.test("返回object，应自动解析为 json", async function () {
  @Controller()
  class TestController {
    @Get("get")
    returnObj() {
      return { abc: 2, d: 2 };
    }
  }
  @Module({ controllers: [TestController] })
  class AppModule {}

  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/get");
  expect(res.headers.get("content-type")).toBe("application/json");

  expect(res.status).toBe(200);
  await expect(res.json()).resolves.toEqual({ abc: 2, d: 2 });
});
Deno.test("The response header is set and a Uint8Array is returned", async function () {
  @Controller()
  class TestController {
    @Header("content-type", "application/json")
    @Get("get")
    customContentType() {
      return new TextEncoder().encode(JSON.stringify({ data: "abc" }));
    }
  }
  @Module({ controllers: [TestController] })
  class AppModule {}

  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/get");
  expect(res.headers.get("content-type")).toBe("application/json");
  const json = await res.json();
  expect(json).toEqual({ data: "abc" });
});

Deno.test("The object is returned but with content-type set", async function () {
  @Controller()
  class TestController {
    @Header("content-type", "text/html")
    @Get("get")
    customContentType() {
      return { data: "abc" };
    }
  }
  @Module({ controllers: [TestController] })
  class AppModule {}

  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/get");
  expect(res.headers.get("content-type")).toBe("application/json");
  const json = await res.json();
  expect(json).toEqual({ data: "abc" });
});
