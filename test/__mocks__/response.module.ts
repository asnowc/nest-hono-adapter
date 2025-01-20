import { Module, Controller, Get, Redirect } from "@nestjs/common";

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
}

@Module({
  controllers: [ExampleController],
})
export class ResponseModule {
  constructor() {}
}
