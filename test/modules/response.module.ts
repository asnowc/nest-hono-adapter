import { Controller, Get, Header, HttpCode, Module, Redirect } from "@nestjs/common";

@Controller()
class ExampleController {
  @Get("hi")
  use() {
    return "hi";
  }
  @Get("status500")
  getError() {
    throw new Error("error");
  }
  @Get("json")
  returnObj() {
    return { abc: 2, d: 2 };
  }
  @Redirect("http://www.baidu.com")
  @Get("redirect")
  redirect() {
    return 1;
  }
  @HttpCode(202)
  @Get("statusCode")
  statusCode() {}

  @Header("abc", "123")
  @Get("header")
  header() {}

  @Get("uint8Array")
  uint8Array() {
    return new Uint8Array(20);
  }

  @Get("readableStream")
  readableStream() {
    return ReadableStream.from([]);
  }
}

@Module({
  controllers: [ExampleController],
})
export class ResponseModule {
  constructor() {}
}
