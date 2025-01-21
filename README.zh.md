## 使用 Hono 实现了 Nest 的适配器

**要求 Nest >=10**

### 使用

`npm install @nestjs/core @nestjs/common nest-hono-adapter @hono/node-server`

**使用 FakeHttpServer 附加到已存在的 Hono 实例**

```ts
import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { HonoAdapter, NestHonoApplication } from "nest-hono-adapter";

const hono = new Hono();

const app = await NestFactory.create<NestHonoApplication>(AppModule, new HonoAdapter({ hono }));
await app.listen(3000, "0.0.0.0"); // 这不会真的监听 "0.0.0.0", HonoAdapter 会创建一个 FakeHttpServer, 因为 Nest 依赖它

app.getUrl(); // FakeHttpServer 将返回 "127.0.0.1"，除非创建 HonoAdapter 时传递了 address 参数

const response = await hono.request("/hi");
```

**或者使用真实的 HttpServer**

```ts
import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { HonoAdapter, NestHonoApplication } from "nest-hono-adapter";
import { createAdaptorServer } from "@hono/node-server";

const app = await NestFactory.create<NestHonoApplication>(
  AppModule,
  new HonoAdapter({
    initHttpServer({ hono, forceCloseConnections, httpsOptions }) {
      return createAdaptorServer({
        fetch: this.instance.fetch,
        createServer: httpsOptions ? https.createServer : http.createServer,
        overrideGlobalObjects: false,
      });
    },
  })
);
```

**使用 Deno.serve()**

Hono 是支持多平台的，在 Deno 或 Bun 上，无需依赖 `@hono/node-server`, 下面是使用 `Deno.serve()` 的示例

```ts
import { NestFactory } from "npm:@nestjs/core";
import { Module } from "npm:@nestjs/common";
import { HonoAdapter, NestHonoApplication } from "npm:nest-hono-adapter";

let serve: Deno.HttpServer<Deno.NetAddr> | undefined;
const adapter = new HonoAdapter({
  close: () => serve!.shutdown(),
  address: () => serve!.addr.hostname,
  async listen({ port, hostname, hono, httpsOptions = {}, forceCloseConnections }) {
    serve = await Deno.serve({ port, hostname, key: httpsOptions.key, cert: httpsOptions.cert }, hono.fetch);
  },
});
const app = await NestFactory.create<NestHonoApplication>(AppModule, adapter);
await app.listen(3000, "127.0.0.1");
```

### 自动推断 content-type

如果未设定请求头，默认情况下，将根据返回的数据类型推断 `content-type`

```ts
@Controller()
class Test {
  @Get("data")
  method() {
    return data;
  }
}
```

| 类型                       | content-type     |
| -------------------------- | ---------------- |
| string                     | text/plain       |
| object                     | application/json |
| Uint8Array                 | none             |
| Blob                       | none             |
| ReadableStream<Uint8Array> | none             |
| undefined                  | none             |
| null                       | none             |

(none 表示不设定)

如果返回其他类型，http 将响应 500 "HonoAdapter cannot convert unknown types"

### 自定义解析请求主体

默认情况下，将自动推断 `application/json`、`application/x-www-form-urlencoded`、`multipart/form-data`、`text/plain`

你可以自定义解析器，例如将 `application/custom` 的请求主体解析未 Map

```ts
const app = await NestFactory.create<NestHonoApplication>(AppModule, adapter);
app.useBodyParser("application/custom", async (honoRequest) => {
  const json = await honoRequest.json();
  return new Map(json);
});

// 通过 @Body 获取请求主体
@Controller()
class Test {
  @Get("data")
  method(@Body() body: Map) {
    return data;
  }
}
```

### 获取请求和响应对象

```ts
import type { HonoResponse } from "nest-hono-adapter";
import type { HonoRequest } from "hono";

@Controller()
class ExampleController {
  @Get("req")
  req(@Req() req: HonoRequest) {
    return req.path;
  }
  @Get("res") // request "/res" will response 'text'
  async res(@Res() res: HonoResponse) {
    res.send(res.text("text"));

    return "123";
  }
}
```

`res.send()` 签名为 send(response: Response)。 由于 nest 的机制，使用 `@Res()` 获取响应对象后，函数的返回值会被忽略

### 未支持的装饰器

| 装饰器       | 备注                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| @Ip()        | 似乎无法通过 Hono 获取到 ip ，getConnInfo(ctx).remote.address 总是 undefined |
| @HostParam() | 暂时不清楚这个装饰器有什么用                                                 |
| @Session()   | 未测试                                                                       |
