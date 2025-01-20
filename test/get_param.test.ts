import { createNestHono } from "./__mocks__/create.ts";
import { expect } from "@std/expect";
import { GetParamModule } from "./__mocks__/get_param.module.ts";
import { assertEquals } from "@std/assert";

const app = await createNestHono(GetParamModule);
await app.app.listen(3000);

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

Deno.test("使用 @Body() 获取 Body", async function () {
  const { hono } = app;
  const res = await hono.request("/body", {
    method: "POST",
    body: JSON.stringify({ abc: "1" }),
    headers: { "content-type": "application/json" },
  });
  expect(res.status).toBe(201);
  const text = await res.text();
  assertEquals(text, "1");
});
Deno.test("使用 @Body() 获取 未解析的 body", async function () {
  const { hono } = app;
  const res = await hono.request("/body", { method: "POST", body: JSON.stringify({ abc: "1" }) });
  expect(res.status).toBe(201);
  const text = await res.text();
  assertEquals(text, "");
});
