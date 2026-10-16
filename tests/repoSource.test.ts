import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RepoNotFoundError,
  TimeoutError,
  FileNotFoundError,
  SourceError,
  fetchFileText,
  fetchTree,
  fetchWithTimeout,
  resolveDefaultBranch,
  RepoClient,
} from "../src/lib/repoSource";
import { storage } from "../src/lib/storage";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveDefaultBranch", () => {
  it("retorna o default_branch do GitHub API", async () => {
    const fetchMock = vi.fn(async (_url: string) => jsonResponse(200, { default_branch: "trunk" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(resolveDefaultBranch("o", "r")).resolves.toBe("trunk");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.github.com/repos/o/r");
  });

  it("404 → RepoNotFoundError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(404, {})));
    await expect(resolveDefaultBranch("o", "r")).rejects.toBeInstanceOf(RepoNotFoundError);
  });

  it("outro status → SourceError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(503, {})));
    await expect(resolveDefaultBranch("o", "r")).rejects.toBeInstanceOf(SourceError);
  });
});

describe("fetchTree", () => {
  it("usa a árvore flat do jsDelivr", async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      jsonResponse(200, {
        files: [
          { name: "/README.md", hash: 111 },
          { name: "/capitulos/cap-01.md", hash: 222 },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const tree = await fetchTree("o", "r", "main");
    expect(tree).toEqual([
      { path: "README.md", hash: "111" },
      { path: "capitulos/cap-01.md", hash: "222" },
    ]);
    expect(String(fetchMock.mock.calls[0][0])).toContain("data.jsdelivr.com/v1/packages/gh/o/r@main");
  });

  it("cai para o GitHub Trees quando o jsDelivr falha", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("jsdelivr")) throw new TypeError("cdn fora");
      return jsonResponse(200, { tree: [{ path: "README.md", type: "blob", sha: "abc" }] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const tree = await fetchTree("o", "r", "main");
    expect(tree).toEqual([{ path: "README.md", hash: "abc" }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("404 em ambos → RepoNotFoundError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(404, {})));
    await expect(fetchTree("o", "r", "main")).rejects.toBeInstanceOf(RepoNotFoundError);
  });
});

describe("fetchFileText", () => {
  it("busca do CDN jsDelivr", async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response("# Olá"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchFileText("o", "r", "main", "a.md")).resolves.toBe("# Olá");
    expect(String(fetchMock.mock.calls[0][0])).toContain("cdn.jsdelivr.net/gh/o/r@main/a.md");
  });

  it("cai para raw quando o CDN falha", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("cdn.jsdelivr.net")) return jsonResponse(503, {});
      return new Response("via raw");
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchFileText("o", "r", "main", "a.md")).resolves.toBe("via raw");
    expect(String(fetchMock.mock.calls[1][0])).toContain("raw.githubusercontent.com/o/r/main/a.md");
  });

  it("404 nos dois → FileNotFoundError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(404, {})));
    await expect(fetchFileText("o", "r", "main", "somei.md")).rejects.toBeInstanceOf(FileNotFoundError);
  });
});

describe("fetchWithTimeout", () => {
  it("aborta após o timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((_resolve, reject) => {
        // nunca resolve; o AbortController dispara o reject
        setTimeout(() => reject(new DOMException("aborted", "AbortError")), 50);
      })),
    );
    await expect(fetchWithTimeout("https://x", 5)).rejects.toBeInstanceOf(TimeoutError);
  });
});

describe("RepoClient — cache com hash", () => {
  function makeClient() {
    const entries = [
      { path: "a.md", hash: "h1" },
      { path: "b.md", hash: "h2" },
    ];
    const fetchMock = vi.fn(async () => new Response("conteúdo"));
    vi.stubGlobal("fetch", fetchMock);
    return { client: new RepoClient({ owner: "o", repo: "r", branch: "main" }, entries), fetchMock };
  }

  it("busca na primeira leitura e serve do cache na segunda", async () => {
    const { client, fetchMock } = makeClient();
    await expect(client.getText("a.md")).resolves.toBe("conteúdo");
    await expect(client.getText("a.md")).resolves.toBe("conteúdo");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("novo hash (novo commit) invalida o cache", async () => {
    const { client, fetchMock } = makeClient();
    await client.getText("a.md"); // cacheia com h1
    const client2 = new RepoClient({ owner: "o", repo: "r", branch: "main" }, [
      { path: "a.md", hash: "h1-novo" },
    ]);
    await client2.getText("a.md");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("has/hashId refletem a árvore", () => {
    const { client } = makeClient();
    expect(client.has("a.md")).toBe(true);
    expect(client.has("z.md")).toBe(false);
    expect(client.hashOf("a.md")).toBe("h1");
    expect(client.hashOf("z.md")).toBe("");
  });

  it("cache sobrevive entre clientes (storage)", async () => {
    const { client, fetchMock } = makeClient();
    await client.getText("b.md");
    const outro = new RepoClient({ owner: "o", repo: "r", branch: "main" }, [{ path: "b.md", hash: "h2" }]);
    await outro.getText("b.md");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(storage.getCachedFile("o", "r", "main", "b.md", "h2")).toBe("conteúdo");
  });
});
