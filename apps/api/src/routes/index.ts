import { Hono } from "hono";
import type { ReqVariables } from "../hono/index.js";
import { authRouter } from "./auth/index.js";
import { articlesRoutes } from "./articles/index.js";
import { mediaRoutes } from "./media/index.js";
import { tagsRoutes } from "./tags/index.js";
import { authorsRoutes } from "./authors/index.js";
import { keysRoutes } from "./keys/index.js";
import { v1Routes } from "./v1/index.js";
import { githubAppRoutes } from "./github-app/index.js";
import { gitlabAppRoutes } from "./gitlab-app/index.js";
import { waitlistRoutes } from "./waitlist/join/route.js";

const routes = new Hono<{ Variables: ReqVariables }>();

routes.route("/auth", authRouter);
routes.route("/articles", articlesRoutes);
routes.route("/media", mediaRoutes);
routes.route("/tags", tagsRoutes);
routes.route("/authors", authorsRoutes);
routes.route("/keys", keysRoutes);
routes.route("/v1", v1Routes);
routes.route("/gh-app", githubAppRoutes);
routes.route("/gl-app", gitlabAppRoutes);
routes.route("/waitlist", waitlistRoutes);

export { routes };
