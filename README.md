## The adapter for Nest is implemented using Hono

**Required Nest >=9 and Node >=18**

[[中文文档]](./README.zh.md)

### Usage

`npm install @nestjs/core @nestjs/common nest-hono-adapter @hono/node-server`

**Attach FakeHttpServer to an existing Hono instance**

```ts
import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { HonoAdapter, NestHonoApplication } from "nest-hono-adapter";

const hono = new Hono();

const app = await NestFactory.create<NestHonoApplication>(AppModule, new HonoAdapter({ hono }));
await app.listen(3000, "0.0.0.0"); // This won't really listen for '0.0.0.0', HonoAdapter will create a FakeHttpServer because Nest depends on it

app.getUrl(); //FakeHttpServer will return '127.0.0.1' unless the address parameter was passed when creating the HonoAdapter

const response = await hono.request("/hi");
```

**Or use a real HttpServer**

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

**Use Deno.serve()** Hono supports multiple platforms, and on Deno or Bun, there is no need to rely on
`@hono/node-server`. Here is an example of using `Deno.serve()`

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

### Automatically infer content-type

If no header is set, the `content-type` will be inferred by default based on the returned data type

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

(none says not set)

If any other type is returned, http responds with 500 "HonoAdapter cannot convert unknown types"

### Custom parsing request bodies

By default, `application/json`, `application/x-www-form-urlencoded`, `multipart/form-data` and `text/plain` are
automatically resolved You can customize the parser, for example to parse the `application/custom` request body unmapped

```ts
const app = await NestFactory.create<NestHonoApplication>(AppModule, adapter);
app.useBodyParser("application/custom", async (honoRequest) => {
  const json = await honoRequest.json();
  return new Map(json);
});

// Get the request body via @Body
@Controller()
class Test {
  @Get("data")
  method(@Body() body: Map) {
    return data;
  }
}
```

### Gets the request and response objects

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

`res.send()` is signed send(response: Response). Because of nest's mechanism, when you use `@Res()` to get the response
object, the function's return value is ignored

### The value taken by the argument decorator

| Decorators | Remarks                |
| ---------- | ---------------------- |
| @Ip()      | Not supported yet      |
| @Session() | Context.get("cession") |

### Middleware

#### Global middleware

`app.use()` 与 `hono.use()` 接口保持一致

```ts
const app = await NestFactory.create<NestHonoApplication>(AppModule, new HonoAdapter());
app.use(async function (ctx: Context, next) {
  return ctx.text("1234");
});
```

#### Module middleware

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

Similar to Hono middleware, if `next()` is not called after the Promise is resolved, 500 status code will be returned.

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
