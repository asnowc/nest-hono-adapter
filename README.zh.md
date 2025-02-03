## 使用 Hono 实现了 Nest 的适配器

**要求 Nest >=9 且 Node >=18**

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
      if (httpsOptions) {
        return createAdaptorServer({
          fetch: hono.fetch,
          createServer: https.createServer,
          serverOptions: { key: httpsOptions.key, cert: httpsOptions.cert },
        });
      } else {
        return createAdaptorServer({
          fetch: hono.fetch,
          createServer: http.createServer,
        });
      }
    },
  }),
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
  listen({ port, hostname, hono, httpsOptions = {}, forceCloseConnections }) {
    return new Promise<void>((resolve) => {
      serve = Deno.serve(
        {
          onListen: () => resolve(),
          port,
          hostname,
          key: httpsOptions.key,
          cert: httpsOptions.cert,
        },
        hono.fetch,
      );
    });
  },
});
const app = await NestFactory.create<NestHonoApplication>(AppModule, adapter);
await app.listen(3000, "127.0.0.1");
```

### 自动推断 content-type

如果未设定请求头，默认情况下，将根据返回的数据类型推断 `content-type`。

```ts
@Controller()
class Test {
  @Get("data")
  method() {
    return data;
  }
}
```

| type                       | content-type     | parser |
| -------------------------- | ---------------- | ------ |
| string                     | text/plain       | text   |
| object                     | application/json | json   |
| Uint8Array                 | none             | binary |
| Blob                       | none             | binary |
| ReadableStream<Uint8Array> | none             | binary |
| undefined                  | none             | null   |
| null                       | none             | null   |

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
import type { Context } from "hono";

@Controller()
class ExampleController {
  @Get("req")
  req(@Req() req: Context) {
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

### 参数装饰器获取的值

| 装饰器     | 备注                   |
| ---------- | ---------------------- |
| @Ip()      | 暂不支持               |
| @Session() | Context.get("cession") |

### 中间件

#### 全局中间件

`app.use()` 与 `hono.use()` 接口保持一致

```ts
const app = await NestFactory.create<NestHonoApplication>(AppModule, new HonoAdapter());
app.use(async function (ctx: Context, next) {
  return ctx.text("1234");
});
```

#### 模块中间件

```ts
@Controller()
class TestController {
  @Get("/test")
  r1(@Req() req: Context) {
    return req.get("var") ?? "0";
  }
  @Get("/test2")
  r2(@Req() req: Context) {
    return req.get("var") ?? "0";
  }
}

@Module({ controllers: [TestController] })
class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(async function (req: Context, res: Context, next: () => void) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      req.set("var", "123");
      next();
    }).forRoutes({ method: RequestMethod.GET, path: "/test" });

    consumer.apply(function (req: Context, res: Context, next: () => void) {
      req.set("var", "321");
      next();
    }).forRoutes({ method: RequestMethod.GET, path: "/test2" });
  }
}
```

与 Hono 中间件类似，如果 Promise 解决后未调用 `next()` 将会返回 500 状态码。

```ts
@Module({ controllers: [TestController] })
class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(async function (req: Context, res: Context, next: Function) {
      req.set("var", "123");
    }).forRoutes({ method: RequestMethod.GET, path: "/test" });
  }
}
```
