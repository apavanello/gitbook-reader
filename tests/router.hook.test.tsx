import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { navigate, useRoute } from "../src/lib/router";

afterEach(() => {
  window.location.hash = "";
});

describe("useRoute (hook)", () => {
  it("parte sem rota e reage a mudanças de hash", async () => {
    const { result } = renderHook(() => useRoute());
    expect(result.current).toBeNull();

    act(() => {
      window.location.hash = "#/o/r/capitulos/a.md";
    });
    await waitFor(() => expect(result.current).toMatchObject({ owner: "o", repo: "r", path: "capitulos/a.md" }));

    act(() => {
      navigate({ owner: "o", repo: "r", branch: "dev", path: "b.md", hash: "" });
    });
    await waitFor(() => expect(result.current).toMatchObject({ branch: "dev", path: "b.md" }));
  });
});
