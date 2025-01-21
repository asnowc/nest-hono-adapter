import type { HonoRequest } from "hono/request";
import type { ServeStaticOptions } from "hono/serve-static";

export type { InternalHonoRes as HonoResponse } from "./_util.ts";
export type { HonoRequest } from "hono/request";

export interface HonoApplicationExtra {
  useBodyParser(contentType: string, parser: HonoBodyParser): void;

  /**
   * Sets a base directory for public assets.
   * Example `app.useStaticAssets('public', { root: '/' })`
   * @returns {this}
   */
  useStaticAssets(path: string, options: ServeStaticOptions): this;
}

export type HonoBodyParser = (context: HonoRequest) => Promise<any> | any;
