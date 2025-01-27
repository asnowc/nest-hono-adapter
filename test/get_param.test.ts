import { createNestHono } from "./__mocks__/create.ts";
import { expect, test } from "vitest";

import { Body, Controller, Get, Headers, HostParam, Ip, Module, Param, Post, Query } from "@nestjs/common";

test("使用 @Query() 获取参数", async function () {
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
  await expect(res.text()).resolves.toBe("aa");
});
test("使用 @Param() 获取参数", async function () {
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
  await expect(res.text()).resolves.toBe("aa");
});

test("使用 @Body() 获取 Body", async function () {
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
  await expect(res.text()).resolves.toBe("1");
});
test("使用 @Body() 获取 未解析的 body", async function () {
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
  await expect(res.text()).resolves.toBe("");
});
test("使用 @Headers() 获取请求头", async function () {
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
  await expect(res.text()).resolves.toBe("123");
});

test("Get the host parameter using @HostParam()", async function () {
  @Controller({ host: ":p.abc.com" })
  class TestController {
    @Get("HostParam")
    hostParam(@HostParam("p") host: string) {
      return host;
    }
  }

  @Module({ controllers: [TestController] })
  class AppModule {}
  const { hono } = await createNestHono(AppModule);

  const res = await hono.request("/HostParam", { headers: { host: "123.abc.com" } });
  await expect(res.text()).resolves.toBe("123");
});
//TODO
test.todo("使用 @Ip() 获取 ip", async function () {
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
  expect(text).toBe("127.0.0.1");
});
