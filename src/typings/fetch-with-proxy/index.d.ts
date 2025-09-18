declare module 'fetch-with-proxy' {
  export default function fetch(url: string, options?: Record<string, unknown>): Promise<Response>
}
