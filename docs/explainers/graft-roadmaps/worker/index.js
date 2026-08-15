function withPath(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, request);
}

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const { pathname } = new URL(request.url);
    const looksLikeAsset = pathname.split("/").at(-1)?.includes(".");
    if (looksLikeAsset) return response;

    return env.ASSETS.fetch(withPath(request, "/index.html"));
  },
};
