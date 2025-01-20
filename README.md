## The adapter for Nest is implemented using Hono

**Required Nest >=10**

### Usage

```ts
import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { HonoAdapter, NestHonoApplication } from "nest-hono-adapter";

const app = await NestFactory.create<NestExpressApplication>(AppModule, new HonoAdapter());

await app.listen(3000, "0.0.0.0");
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
const app = await NestFactory.create<NestExpressApplication>(AppModule, adapter);
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
