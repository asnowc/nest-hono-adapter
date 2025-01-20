import { Module, Controller, Get, Param, Query, Body, Post } from "@nestjs/common";

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
}

@Module({
  controllers: [ExampleController],
})
export class GetParamModule {
  constructor() {}
}
