declare module "fetch-with-proxy" {
    export default function fetch(url: any, options?: any): Promise<import("node-fetch").Response>;
}
