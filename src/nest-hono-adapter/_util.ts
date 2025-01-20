import { HonoRequest } from "hono/request";
import { NestReq } from "./nest.ts";
import type { Context } from "hono";

export function createHonoReq(
  req: HonoRequest,
  body: Record<string, any>,
  params: Record<string, string>,
  rawBody: any
): HonoReq {
  const honoReq = req as HonoReq;
  let url: URL | undefined;
  const nestReq: NestReq = {
    rawBody,
    body,
    headers: new Proxy(req.raw.headers, {
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
          if (!url) url = new URL(req.url);
          return url.searchParams.get(p as string);
        },
        ownKeys(target: any) {
          if (!url) url = new URL(req.url);
          return Array.from(url.searchParams.keys());
        },
      }
    ),
    session: undefined, //TODO session
    ip: "", //TODO ip
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
  if (body instanceof Response) return body;

  const responseContentType = headers["Content-Type"] || headers["content-type"];
  if (responseContentType) {
    switch (responseContentType) {
      case "application/json":
        return ctx.json(body, undefined, headers);
      case "text/xp": //TODO
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
        return ctx.json({ message: "Nest reply unknown data type" }, 500, headers);
    }
  }
}

export type HonoReq = NestReq & HonoRequest;

export type HonoRes = Omit<Context, "req"> & {
  send(data?: any): void;
};

const NEST_BODY = Symbol("nest_body");
