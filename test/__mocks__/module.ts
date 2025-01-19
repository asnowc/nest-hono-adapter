import { Module, Controller, Get, Param, Query, Body, Res, Req, Post, Redirect } from "@nestjs/common";
import type { HonoRes, HonoReq } from "@asla/nest-hono-adapter";

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
  @Get("query")
  parserQuery(@Query("abc") abc: string) {
    return abc;
  }
  @Get("param/:id")
  parserParam(@Param("id") id: string) {
    return id;
  }

  @Post("body")
  parserBody(@Body("abc") abc: string) {
    return abc;
  }
  @Get("req")
  req(@Req() req: HonoReq) {
    return req.path;
  }
  @Get("res")
  res(@Res() res: HonoRes) {
    res.send(res.text("/res"));
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
export class ExampleModule {
  constructor() {}
}
