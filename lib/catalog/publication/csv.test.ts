import { describe, expect, it } from "vitest";
import { stringifyCsv } from "./csv";

describe("stringifyCsv", () => {
  it("writes a header line followed by one line per row, CRLF-terminated", () => {
    const csv = stringifyCsv(["a", "b"], [{ a: "1", b: "2" }]);
    expect(csv).toBe("a,b\r\n1,2\r\n");
  });

  it("quotes fields containing commas, quotes or newlines", () => {
    const csv = stringifyCsv(["name"], [{ name: 'Radiator, 500x1000 "White"' }]);
    expect(csv).toContain('"Radiator, 500x1000 ""White"""');
  });

  it("fills a missing key with an empty field rather than throwing", () => {
    const csv = stringifyCsv(["a", "b"], [{ a: "1" }]);
    expect(csv).toBe("a,b\r\n1,\r\n");
  });

  it("is deterministic for the same input", () => {
    const rows = [{ a: "1", b: "2" }, { a: "3", b: "4" }];
    expect(stringifyCsv(["a", "b"], rows)).toBe(stringifyCsv(["a", "b"], rows));
  });
});
