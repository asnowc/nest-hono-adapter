import { Module } from "@nestjs/common";
import { ExampleModule } from "./example/example.module.ts";

@Module({
  imports: [ExampleModule],
})
export class AppModule {
  constructor() {}
}
