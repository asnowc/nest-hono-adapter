## The adapter for Nest is implemented using Hono

**Required Nest >=10**

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
      return createAdaptorServer({
        fetch: this.instance.fetch,
        createServer: httpsOptions ? https.createServer : http.createServer,
        overrideGlobalObjects: false,
      });
    },
  })
);
```

**Use Deno.serve()**
Hono supports multiple platforms, and on Deno or Bun, there is no need to rely on `@hono/node-server`. Here is an example of using `Deno.serve()`

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

| type                       | content-type     |
| -------------------------- | ---------------- |
| string                     | text/plain       |
| object                     | application/json |
| Uint8Array                 | none             |
| Blob                       | none             |
| ReadableStream<Uint8Array> | none             |
| undefined                  | none             |
| null                       | none             |

(none says not set)

If any other type is returned, http responds with 500 "HonoAdapter cannot convert unknown types"

### Custom parsing request bodies

By default, `application/json`, `application/x-www-form-urlencoded`, `multipart/form-data` and `text/plain` are automatically resolved
You can customize the parser, for example to parse the `application/custom` request body unmapped

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

`res.send()` is signed send(response: Response). Because of nest's mechanism, when you use `@Res()` to get the response object, the function's return value is ignored

### Unsupported decorators

| Decorators   | Remarks                                                                                |
| ------------ | -------------------------------------------------------------------------------------- |
| @Ip()        | Can't seem to get the ip via Hono, getConnInfo(ctx).remote.address is always undefined |
| @HostParam() | Not sure what this decorator does                                                      |
| @Session()   | Not tested                                                                             |
