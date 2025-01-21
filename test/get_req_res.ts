import { createNestHono } from "./__mocks__/create.ts";
import { expect } from "@std/expect";
import { OnlyGetReqAndResModule } from "./__mocks__/get_request_response.module.ts";
import { assertEquals } from "@std/assert";

const app = await createNestHono(OnlyGetReqAndResModule);

await app.app.listen(3000);

Deno.test("使用 @Req() 获取请求", async function () {
  const { hono } = app;
  const res = await hono.request("/req");
  expect(res.status).toBe(200);
  const data = await res.json();
  assertEquals(data, { query: {}, params: {} });
});
Deno.test("使用 @Res() 获取响应", async function () {
  const { hono } = app;
  const res = await hono.request("/res");
  expect(res.status).toBe(200);
  const data = await res.text();
  assertEquals(data, "/res");
});
Deno.test("使用 @Res() 获取响应, 但函数返回前未调用 send(), 将响应空的 body", async function () {
  const { hono } = app;
  const res = await hono.request("/resNoSend");
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("");
});
