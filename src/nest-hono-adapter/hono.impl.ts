import type * as honoReq from "hono/request";
import type { ServeStaticOptions } from "hono/serve-static";
import type { HonoRes } from "./_util.ts";

export type HonoRequest = honoReq.HonoRequest;
export type HonoResponse = HonoRes;

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
