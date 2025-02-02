import { createNestHono } from "./__mocks__/create.ts";
import { Controller, Get, Header, Module } from "@nestjs/common";
import { expect, test } from "vitest";
test("Returns object", async function () {
  @Controller()
  class TestController {
    @Get("json")
    returnObj() {
      return { abc: 2, d: 2 };
    }
  }
  @Module({ controllers: [TestController] })
  class AppModule {}

  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/json");
  expect(res.headers.get("content-type")).toBe("application/json");

  expect(res.status).toBe(200);
  await expect(res.json(), "should be parsed to json").resolves.toEqual({ abc: 2, d: 2 });
});
test("Returns string", async function () {
  @Controller()
  class TestController {
    @Get("text")
    string() {
      return "string";
    }
  }
  @Module({ controllers: [TestController] })
  class AppModule {}

  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/text");
  expect(res.headers.get("content-type")).toBe("text/plain; charset=UTF-8");

  expect(res.status).toBe(200);
  await expect(res.text(), "should be parsed to text").resolves.toBe("string");
});
test("Returns undefined or null", async function () {
  @Controller()
  class TestController {
    @Get("undefined")
    undefined() {
      return undefined;
    }
    @Get("null")
    null() {
      return null;
    }
  }
  @Module({ controllers: [TestController] })
  class AppModule {}

  const { hono } = await createNestHono(AppModule);

  const resNull = await hono.request("/undefined");
  expect(resNull.status).toBe(200);
  expect(resNull.headers.get("content-type")).toBe(null);
  expect(resNull.body).toBe(null);

  const resUndefined = await hono.request("/undefined");
  expect(resUndefined.status).toBe(200);
  expect(resUndefined.headers.get("content-type")).toBe(null);
  expect(resUndefined.body).toBe(null);
});
test("The response header is set and a Uint8Array is returned", async function () {
  @Controller()
  class TestController {
    @Header("content-type", "text/plain; charset=UTF-8")
    @Get("get")
    customContentType() {
      const u8Arr = new TextEncoder().encode("1abc2");
      return u8Arr.subarray(1, -1);
    }
  }
  @Module({ controllers: [TestController] })
  class AppModule {}

  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/get");
  expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  await expect(res.text()).resolves.toBe("abc");
});
test("The object is returned but with content-type set", async function () {
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
  expect(res.headers.get("content-type"), "content-type should be 'test/html'").toBe("text/html");
  const json = await res.json();
  expect(json, "data use json parser").toEqual({ data: "abc" });
});
