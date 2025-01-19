import type { RequestHandler } from "@nestjs/common/interfaces";

//  nest 项目packages\core\router\route-params-factory.ts

export interface NestReq {
  rawBody?: any;
  session?: any;
  files?: any;
  body: Record<string, any>;
  params: Record<string, string | undefined>;
  ip: string;
  hosts: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
}

export type NestHandler<Req extends NestReq, Res extends object> = RequestHandler<Req, Res>;
