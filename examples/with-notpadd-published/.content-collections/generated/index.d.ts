import configuration from "../../content-collections.ts";
import { GetTypeByName } from "notpadd-core";

export type Post = GetTypeByName<typeof configuration, "posts">;
export declare const allPosts: Array<Post>;

export {};
