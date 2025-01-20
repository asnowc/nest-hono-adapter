import { HonoRequest } from "hono/request";
import { NestReq } from "./nest.ts";
import type { Context } from "hono";
import { getConnInfo } from "hono/cloudflare-workers";

export function createHonoReq(
  ctx: Context,
  info: {
    body: Record<string, any>;
    params: Record<string, string>;
    rawBody: any;
  }
): HonoReq {
  const { body, params, rawBody } = info;
  const honoReq = ctx.req as HonoReq;
  let url: URL | undefined;
  const nestReq: NestReq = {
    rawBody,
    body,
    headers: new Proxy(honoReq.raw.headers, {
      get(target: Headers, p) {
        return target.get(p as string);
      },
      ownKeys(target: Headers) {
        return Array.from(target.keys());
      },
    }) as Record<string, any>,
    query: new Proxy(
      {},
      {
        get(target: any, p) {
          if (!url) url = new URL(honoReq.url);
          return url.searchParams.get(p as string);
        },
        ownKeys(target: any) {
          if (!url) url = new URL(honoReq.url);
          return Array.from(url.searchParams.keys());
        },
      }
    ),
    ip: getConnInfo(ctx).remote.address as string,
    session: ctx.get("session") ?? {},
    hosts: {}, //TODO hosts
    files: {}, //TODO files
    params: params,
  };
  Object.assign(honoReq, nestReq);
  return honoReq;
}

function mountResponse(ctx: Context, data: any) {
  Reflect.set(ctx, NEST_BODY, data);
}

export function createHonoRes(context: Context): HonoRes {
  Reflect.set(context, "send", function (this: Context, response: any = this.newResponse(null)) {
    mountResponse(this, response);
  });
  return context as any as HonoRes;
}
export function sendResult(ctx: Context, headers: Record<string, string>) {
  const body = Reflect.get(ctx, NEST_BODY);
  if (body instanceof Response) {
    Object.entries(headers).forEach(([key, value]) => body.headers.set(key, value));
    return body;
  }

  let responseContentType = headers["content-type"];

  if (responseContentType) {
    const i = responseContentType.indexOf(";");
    if (i > 0) responseContentType = responseContentType.slice(0, i);
    switch (responseContentType) {
      case "application/json":
        return ctx.json(body, undefined, headers);
      case "text/plain":
        return ctx.text(body, undefined, headers);
      case "text/html":
        return ctx.html(body, undefined, headers);
      default:
        return ctx.body(body, undefined, headers);
    }
  } else {
    switch (typeof body) {
      case "string":
        return ctx.text(body, undefined, headers);
      case "object": {
        if (body instanceof ReadableStream || body instanceof ArrayBuffer) {
          return ctx.body(body, undefined, headers);
        } else if (body instanceof Uint8Array) {
          return ctx.body(ReadableStream.from([body]), undefined, headers);
        } else if (body instanceof Blob) {
          return ctx.body(body.stream(), undefined, headers);
        } else {
          return ctx.json(body, undefined, headers);
        }
      }
      case "undefined": {
        return ctx.body(null, undefined, headers);
      }
      default:
        return ctx.text("HonoAdapter cannot convert unknown types", 500, headers);
    }
  }
}

export type HonoReq = NestReq & HonoRequest;

export type HonoRes = Omit<Context, "req"> & {
  send(data?: any): void;
};

const NEST_BODY = Symbol("nest_body");
