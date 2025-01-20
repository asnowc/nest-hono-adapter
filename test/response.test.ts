import { createNestHono } from "./__mocks__/create.ts";
import { expect } from "@std/expect";
import { ResponseModule } from "./__mocks__/response.module.ts";
import { assertEquals } from "@std/assert";

const app = await createNestHono(ResponseModule);
await app.app.listen(3000);

Deno.test("response hello word", async function () {
  const { hono } = app;
  const res = await hono.request("/hi");
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toBe("text/plain; charset=UTF-8");
});
Deno.test("内部错误", async function () {
  const { hono } = app;
  const res = await hono.request("/status500");
  expect(res.status).toBe(500);
});
Deno.test("返回object，应自动解析为 json", async function () {
  const { hono } = app;
  const res = await hono.request("/json");
  expect(res.headers.get("content-type")).toBe("application/json");

  expect(res.status).toBe(200);
  assertEquals(await res.json(), { abc: 2, d: 2 });
});
Deno.test("请求未设定的路由，应返回404", async function () {
  const { hono } = app;
  const res = await hono.request("/aaaaaaaaaa");
  expect(res.status).toBe(404);
});
Deno.test("使用 @Redirect() 重定向", async function () {
  const { hono } = app;
  const res = await hono.request("/redirect", { redirect: "manual" });
  expect(res.status).toBe(302);

  assertEquals(res.headers.get("location"), "http://www.baidu.com");
});
Deno.test("使用 @HttpCode() 设定响应状态码", async function () {
  const { hono } = app;
  const res = await hono.request("/statusCode");
  expect(res.status).toBe(202);
});
Deno.test("使用 @Header() 设定响应头", async function () {
  const { hono } = app;
  const res = await hono.request("/header");
  expect(res.headers.get("abc")).toBe("123");
});
