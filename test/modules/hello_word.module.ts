import { Controller, Get, Module } from "@nestjs/common";

@Controller()
class TestController {
  @Get("hi")
  method() {
    return "hello word";
  }
}

@Module({ controllers: [TestController] })
export class AppModule {}
