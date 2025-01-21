import { NestFactory } from "@nestjs/core";
import { HonoAdapter, NestHonoApplication } from "nest-hono-adapter";

export async function createNestHono(AppModule: new (...args: any[]) => any) {
  const adapter = new HonoAdapter();
  const app = await NestFactory.create<NestHonoApplication>(AppModule, adapter);
  return {
    app,
    adapter,
    hono: adapter.getInstance(),
  };
}
