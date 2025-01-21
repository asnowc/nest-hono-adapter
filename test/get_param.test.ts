import { createNestHono } from "./__mocks__/create.ts";
import { expect } from "@std/expect";
import { assertEquals } from "@std/assert";

import { Body, Controller, Get, Headers, HostParam, Ip, Module, Param, Post, Query } from "@nestjs/common";

Deno.test("使用 @Query() 获取参数", async function () {
  @Controller()
  class TestController {
    @Get("query")
    parserQuery(@Query("abc") abc: string) {
      return abc;
    }
  }
  @Module({ controllers: [TestController] })
  class AppModule {}
  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/query?abc=aa");
  const text = await res.text();
  assertEquals(text, "aa");
});
Deno.test("使用 @Param() 获取参数", async function () {
  @Controller()
  class TestController {
    @Get("param/:id")
    parserParam(@Param("id") id: string) {
      return id;
    }
  }

  @Module({ controllers: [TestController] })
  class AppModule {}
  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/param/aa");
  const text = await res.text();
  assertEquals(text, "aa");
});

Deno.test("使用 @Body() 获取 Body", async function () {
  @Controller()
  class TestController {
    @Post("body")
    parserBody(@Body("abc") abc: string) {
      return abc;
    }
  }

  @Module({ controllers: [TestController] })
  class AppModule {}
  const { hono } = await createNestHono(AppModule);

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
  @Controller()
  class TestController {
    @Post("body")
    parserBody(@Body("abc") abc: string) {
      return abc;
    }
  }

  @Module({ controllers: [TestController] })
  class AppModule {}
  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/body", { method: "POST", body: JSON.stringify({ abc: "1" }) });
  expect(res.status).toBe(201);
  const text = await res.text();
  assertEquals(text, "");
});
Deno.test("使用 @Headers() 获取请求头", async function () {
  @Controller()
  class TestController {
    @Get("headers")
    headers(@Headers("abc") abc: string) {
      return abc;
    }
  }

  @Module({ controllers: [TestController] })
  class AppModule {}
  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/headers", { headers: { abc: "123" } });
  const text = await res.text();
  assertEquals(text, "123");
});
//TODO
Deno.test("使用 @HostParam() 获取 host", { ignore: true }, async function () {
  @Controller()
  class TestController {
    @Get("headers")
    headers(@Headers("abc") abc: string) {
      return abc;
    }
    @Get("HostParam")
    hostParam(@HostParam() host: string) {
      return host;
    }
  }

  @Module({ controllers: [TestController] })
  class AppModule {}
  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/HostParam", { headers: { host: "abc.com" } });
  const text = await res.text();
  assertEquals(text, "abc.com");
});
//TODO
Deno.test("使用 @Ip() 获取 ip", { ignore: true }, async function () {
  @Controller()
  class TestController {
    @Get("ip")
    ip(@Ip() ip: string) {
      return ip;
    }
  }

  @Module({ controllers: [TestController] })
  class AppModule {}
  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/ip", {});
  const text = await res.text();
  assertEquals(text, "127.0.0.1");
});
