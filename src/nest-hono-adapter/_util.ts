import type { HonoRequest } from "hono/request";
import type { NestReq } from "./nest.ts";
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
  ctx.req.queries();
  ctx.req.query();
  const nestReq: Omit<NestReq, "headers" | "query" | "ip"> = {
    rawBody,
    body,
    session: ctx.get("session") ?? {},
    hosts: {}, //TODO hosts
    files: {}, //TODO files
    params: params,
  };
  Object.assign(honoReq, nestReq);

  let ip: string | undefined;
  let headers: Record<string, any> | undefined;
  let query: Record<string, any> | undefined;
  Object.defineProperties(honoReq, {
    headers: {
      get() {
        return headers ?? (headers = Object.fromEntries(honoReq.raw.headers));
      },
      enumerable: true,
    },
    // HonoRequest already has a query attribute, so we need to use a Proxy to override it
    query: {
      value: new Proxy(ctx.req.query, {
        get(rawQuery, key: string) {
          if (!query) query = rawQuery.call(honoReq);
          return query[key];
        },
        ownKeys(rawQuery) {
          if (!query) query = rawQuery.call(honoReq);
          return Object.keys(query);
        },
        apply(rawQuery, thisArg, args) {
          return rawQuery.apply(thisArg, args as any);
        },
      }),
      enumerable: true,
      writable: false,
    },
    ip: {
      get() {
        return ip ?? (ip = getConnInfo(ctx).remote.address as string);
      },
      enumerable: true,
    },
  });

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
