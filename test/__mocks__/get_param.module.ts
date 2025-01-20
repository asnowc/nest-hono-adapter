import { Module, Controller, Get, Param, Query, Body, Post, Headers, HostParam, Ip } from "@nestjs/common";

@Controller()
class ExampleController {
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
  @Get("headers")
  headers(@Headers("abc") abc: string) {
    return abc;
  }
  @Get("HostParam")
  hostParam(@HostParam() host: string) {
    return host;
  }
  @Get("ip")
  ip(@Ip() ip: string) {
    return ip;
  }
}

@Module({
  controllers: [ExampleController],
})
export class GetParamModule {
  constructor() {}
}
