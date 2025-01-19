import { createNestHono } from "./__mocks__/create.ts";
import { expect } from "@std/expect";
import { ExampleModule } from "./__mocks__/module.ts";
import { assertEquals } from "@std/assert";

const app = await createNestHono(ExampleModule);
// app.hono.get("/aaa", async function (ctx, req) {
//   return ctx.json({ ok: "yes" });
// });
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
Deno.test("使用 @Query() 获取参数", async function () {
  const { hono } = app;
  const res = await hono.request("/query?abc=aa");
  const text = await res.text();
  assertEquals(text, "aa");
});
Deno.test("使用 @Param() 获取参数", async function () {
  const { hono } = app;
  const res = await hono.request("/param/aa");
  const text = await res.text();
  assertEquals(text, "aa");
});

// Deno.test("使用 @Body() 获取 Body", async function () {
const { hono } = app;
const res = await hono.request("/body", {
  method: "POST",
  body: JSON.stringify({ abc: "1" }),
  headers: { "content-type": "application/json" },
});
expect(res.status).toBe(201);
const text = await res.text();
assertEquals(text, "1");
// });
Deno.test("使用 @Body() 获取 未解析的 body", async function () {
  const { hono } = app;
  const res = await hono.request("/body", { method: "POST", body: JSON.stringify({ abc: "1" }) });
  expect(res.status).toBe(201);
  const text = await res.text();
  assertEquals(text, "");
});

Deno.test("使用 @Req() 获取请求", async function () {
  const { hono } = app;
  const res = await hono.request("/req");
  expect(res.status).toBe(200);
  const data = await res.text();
  assertEquals(data, "/req");
});
Deno.test("使用 @Res() 获取响应", async function () {
  const { hono } = app;
  const res = await hono.request("/res");
  expect(res.status).toBe(200);
  const data = await res.text();
  assertEquals(data, "/res");
});
Deno.test("使用 @Redirect() 重定向", async function () {
  const { hono } = app;
  const res = await hono.request("/redirect", { redirect: "manual" });
  expect(res.status).toBe(302);

  assertEquals(res.headers.get("location"), "http://www.baidu.com");
});
