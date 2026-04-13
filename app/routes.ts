import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("test/:sessionId", "routes/test.$sessionId.tsx"),
  route("result/:sessionId", "routes/result.$sessionId.tsx"),
  route("admin", "routes/admin.tsx"),
  route(".well-known/*", "routes/well-known.tsx"),
] satisfies RouteConfig;
