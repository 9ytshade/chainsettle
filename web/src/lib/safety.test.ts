import { describe, expect, it } from "vitest";
import {
  checkContractVersionCompatibility,
  formatWeiToGen,
  isAllowedEvidenceFile,
  isEthereumAddress,
  isHttpsUrl,
  isPublicGithubCommitUrl,
  parseGenToWei,
  validateCriteria,
  validateEvidencePaths,
} from "./safety";

describe("safety utilities", () => {
  it("parses and formats GEN wei", () => {
    expect(parseGenToWei("1")).toBe(BigInt("1000000000000000000"));
    expect(parseGenToWei("0.5")).toBe(BigInt("500000000000000000"));
    expect(formatWeiToGen(BigInt("1000000000000000000"))).toBe("1");
    expect(formatWeiToGen(BigInt("500000000000000000"))).toBe("0.5");
  });

  it("validates ethereum addresses", () => {
    expect(isEthereumAddress("0x1234567890123456789012345678901234567890")).toBe(true);
    expect(isEthereumAddress("not-an-address")).toBe(false);
  });

  it("validates HTTPS URLs", () => {
    expect(isHttpsUrl("https://example.com")).toBe(true);
    expect(isHttpsUrl("http://example.com")).toBe(false);
    expect(isHttpsUrl("invalid")).toBe(false);
  });

  it("validates public GitHub commit URLs", () => {
    const valid = "https://github.com/alice/repo/commit/0123456789abcdef0123456789abcdef01234567";
    expect(isPublicGithubCommitUrl(valid)).toBe(true);
    expect(isPublicGithubCommitUrl("https://github.com/alice/repo/pull/1")).toBe(false);
    expect(isPublicGithubCommitUrl("https://github.com/alice/repo/commit/short")).toBe(false);
  });

  it("validates evidence paths manifest", () => {
    expect(validateEvidencePaths("src/app.tsx\npackage.json").valid).toBe(true);
    expect(validateEvidencePaths("").valid).toBe(false);
    expect(validateEvidencePaths("../secret.py").valid).toBe(false);
    expect(validateEvidencePaths("unsupported.exe").valid).toBe(false);
  });

  it("validates allowed evidence file extensions", () => {
    expect(isAllowedEvidenceFile("src/index.ts")).toBe(true);
    expect(isAllowedEvidenceFile("Dockerfile")).toBe(true);
    expect(isAllowedEvidenceFile("malware.exe")).toBe(false);
  });

  it("validates criteria", () => {
    expect(validateCriteria("Item 1: Build UI\nItem 2: API routes").valid).toBe(true);
    expect(validateCriteria("too short").valid).toBe(false);
  });

  it("verifies contract versions", () => {
    expect(checkContractVersionCompatibility("1.2.0").compatible).toBe(true);
    expect(checkContractVersionCompatibility("1.1.0").compatible).toBe(true);
    expect(checkContractVersionCompatibility("1.0.0").compatible).toBe(true);
    expect(checkContractVersionCompatibility("2.0.0").compatible).toBe(false);
  });
});
