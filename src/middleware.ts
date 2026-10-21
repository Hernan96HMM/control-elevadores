import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/panel/:path*", "/api/panel/:path*", "/api/uploads/:path*", "/api/stream"],
};
