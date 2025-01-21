import { NestFactory } from "@nestjs/core";
import { HonoAdapter, NestHonoApplication } from "nest-hono-adapter";

export async function createNestHono(AppModule: new (...args: any[]) => any) {
  const adapter = new HonoAdapter();
  const app = await NestFactory.create<NestHonoApplication>(AppModule, adapter);
  await app.listen(3000);
  return {
    app,
    adapter,
    hono: adapter.getInstance(),
  };
}
