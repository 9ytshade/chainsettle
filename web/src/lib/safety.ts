export function parseGenToWei(value: string): bigint {
  const cleaned = value.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(cleaned)) {
    throw new Error("Enter a whole or decimal GEN amount with up to 18 decimal places.");
  }
  const [whole, fraction = ""] = cleaned.split(".");
  return BigInt(`${whole}${fraction.padEnd(18, "0")}`);
}

export function formatWeiToGen(wei: string | bigint | number): string {
  try {
    const raw = typeof wei === "bigint" ? wei.toString() : String(wei);
    const val = BigInt(raw);
    const divisor = BigInt("1000000000000000000");
    const whole = val / divisor;
    const fraction = val % divisor;
    if (fraction === BigInt(0)) return whole.toString();
    const fracStr = fraction.toString().padStart(18, "0").replace(/0+$/, "");
    return `${whole}.${fracStr}`;
  } catch {
    return "0";
  }
}

export function formatGenDisplay(wei: string | bigint | number): string {
  try {
    const raw = typeof wei === "bigint" ? wei.toString() : String(wei);
    const val = BigInt(raw);
    const divisor = BigInt("1000000000000000000");
    const whole = val / divisor;
    const fraction = val % divisor;

    if (whole >= 1_000_000_000_000n) {
      const trillions = Number(whole / 1_000_000_000_000n);
      return `${trillions.toLocaleString("en-US")}T`;
    }
    if (whole >= 1_000_000_000n) {
      return `${(Number(whole) / 1e9).toFixed(2)}B`;
    }
    if (whole >= 1_000_000n) {
      return `${(Number(whole) / 1e6).toFixed(2)}M`;
    }
    if (whole >= 10_000n) {
      return whole.toLocaleString("en-US");
    }
    if (fraction === BigInt(0)) return whole.toString();
    const fracStr = fraction.toString().padStart(18, "0").slice(0, 2).replace(/0+$/, "");
    return fracStr ? `${whole}.${fracStr}` : whole.toString();
  } catch {
    return "0";
  }
}

export function isEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeHttpsUrl(value: string): string {
  const cleaned = value.trim();
  if (!cleaned.startsWith("https://")) return cleaned;
  const afterScheme = cleaned.slice("https://".length);
  if (!afterScheme.includes("/")) {
    return `${cleaned}/`;
  }
  return cleaned;
}

export function isPublicGithubCommitUrl(value: string): boolean {
  const cleaned = value.trim();
  const prefix = "https://github.com/";
  if (cleaned.length > 2048 || !cleaned.startsWith(prefix) || /[?#@\\]/.test(cleaned)) return false;

  const parts = cleaned.slice(prefix.length).split("/");
  if (parts.length !== 4) return false;
  const [owner, repository, kind, commitSha] = parts;
  const ownerCharacters = /^[A-Za-z0-9-]+$/;
  const repositoryCharacters = /^[A-Za-z0-9._-]+$/;

  return Boolean(
    owner &&
      owner.length <= 39 &&
      ownerCharacters.test(owner) &&
      !owner.startsWith("-") &&
      !owner.endsWith("-") &&
      repository &&
      repository.length <= 100 &&
      repositoryCharacters.test(repository) &&
      repository !== "." &&
      repository !== ".." &&
      kind === "commit" &&
      commitSha &&
      /^[a-f0-9]{40}$/i.test(commitSha)
  );
}

export function isAllowedEvidenceFile(path: string): boolean {
  const lower = path.toLowerCase();
  const allowedExtensions = [
    ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".txt",
    ".html", ".css", ".scss", ".sass", ".less", ".yaml", ".yml", ".toml", ".sol",
    ".rs", ".go", ".java", ".kt", ".sh", ".ps1", ".sql", ".vue", ".svelte",
  ];
  if (allowedExtensions.some((ext) => lower.endsWith(ext))) {
    return true;
  }

  const basename = lower.split("/").pop() ?? "";
  const allowedBasenames = ["dockerfile", "makefile", "readme", "license", ".env.example"];
  return allowedBasenames.includes(basename);
}

export function validateEvidencePaths(value: string): { valid: boolean; error?: string; paths: string[] } {
  const cleaned = value.trim();
  if (cleaned.length === 0) {
    return { valid: false, error: "Provide at least one source evidence path.", paths: [] };
  }
  if (cleaned.length > 1500) {
    return { valid: false, error: "Source evidence manifest is too long (maximum 1,500 characters).", paths: [] };
  }

  const rawPaths = cleaned.split("\n").map((line) => line.trim()).filter(Boolean);
  if (rawPaths.length === 0 || rawPaths.length > 6) {
    return { valid: false, error: "Provide between one and six source evidence paths.", paths: [] };
  }

  const normalized: string[] = [];
  for (const path of rawPaths) {
    if (path.length > 240) {
      return { valid: false, error: `Path exceeds maximum length of 240 characters.`, paths: [] };
    }
    if (path.startsWith("/") || path.endsWith("/") || /[\\?#%]/.test(path)) {
      return { valid: false, error: `Invalid source evidence path "${path}".`, paths: [] };
    }

    const segments = path.split("/");
    for (const segment of segments) {
      if (segment === "" || segment === "." || segment === "..") {
        return { valid: false, error: `Invalid path traversal in "${path}".`, paths: [] };
      }
    }

    if (!/^[a-zA-Z0-9_\-./]+$/.test(path)) {
      return { valid: false, error: `Invalid characters in source path "${path}".`, paths: [] };
    }

    if (!isAllowedEvidenceFile(path)) {
      return { valid: false, error: `Path "${path}" must reference a supported text file.`, paths: [] };
    }

    if (normalized.includes(path)) {
      return { valid: false, error: `Duplicate source path "${path}".`, paths: [] };
    }
    normalized.push(path);
  }

  return { valid: true, paths: normalized };
}

export function validateCriteria(value: string): { valid: boolean; error?: string; items: string[] } {
  const cleaned = value.trim();
  if (cleaned.length < 10) {
    return { valid: false, error: "Acceptance criteria are too short (minimum 10 characters).", items: [] };
  }
  if (cleaned.length > 3000) {
    return { valid: false, error: "Acceptance criteria are too long (maximum 3,000 characters).", items: [] };
  }

  const items = cleaned.split("\n").map((line) => line.trim()).filter(Boolean);
  if (items.length === 0 || items.length > 5) {
    return { valid: false, error: "Provide between one and five criteria (one per line).", items: [] };
  }

  for (const item of items) {
    if (item.length < 3) {
      return { valid: false, error: "Each criterion must be at least 3 characters.", items: [] };
    }
    if (item.length > 600) {
      return { valid: false, error: "A criterion exceeds maximum length of 600 characters.", items: [] };
    }
  }

  return { valid: true, items };
}

export function checkContractVersionCompatibility(version: string): { compatible: boolean; expected: string } {
  const expected = "1.2.0";
  const norm = version.trim();
  return { compatible: norm === "1.2.0" || norm === "1.1.0" || norm === "1.0.0", expected };
}
