import * as process from "process";
import {
  execFileSync,
  ExecFileSyncOptions,
  SpawnSyncReturns,
} from "child_process";
import * as fs from "fs";
import * as path from "path";
import { beforeAll, expect, test } from "@jest/globals";

beforeAll(() => {
  const options: fs.MakeDirectoryOptions = {
    recursive: true,
  };
  fs.mkdirSync("/tmp/test-working-dir", options);
});

test("test runs", () => {
  const env: { [key: string]: string } = { ...process.env } as {
    [key: string]: string;
  };
  env["INPUT_RUN"] = "pwd";
  env["INPUT_LINUX-PKGS"] = "twm";
  env["INPUT_LINUX-SETUP"] = "twm";
  env["INPUT_LINUX-SETUP-DELAY"] = "500";
  env["INPUT_LINUX-TEARDOWN"] = "pkill ^twm";
  const options: ExecFileSyncOptions = {
    env: env,
  };

  const np = process.execPath;
  const ip = path.join(__dirname, "..", "lib", "main.js");
  expect(execFileSync(np, [ip], options).toString()).toContain(process.cwd());
});

test("test runs (compatibility inputs)", () => {
  const env: { [key: string]: string } = { ...process.env } as {
    [key: string]: string;
  };
  env["INPUT_RUN"] = "pwd";
  env["INPUT_LINUX_PKGS"] = "twm";
  env["INPUT_LINUX_SETUP"] = "twm";
  env["INPUT_LINUX_SETUP_DELAY"] = "500";
  env["INPUT_LINUX_TEARDOWN"] = "pkill ^twm";
  const options: ExecFileSyncOptions = {
    env: env,
  };

  const np = process.execPath;
  const ip = path.join(__dirname, "..", "lib", "main.js");
  expect(execFileSync(np, [ip], options).toString()).toContain(process.cwd());
});

test("test working dir", () => {
  const env: { [key: string]: string } = { ...process.env } as {
    [key: string]: string;
  };
  env["INPUT_RUN"] = "pwd";
  env["INPUT_WORKING-DIRECTORY"] = "/tmp/test-working-dir";
  const options: ExecFileSyncOptions = {
    env: env,
  };

  const np = process.execPath;
  const ip = path.join(__dirname, "..", "lib", "main.js");
  expect(execFileSync(np, [ip], options).toString()).toContain(
    "/tmp/test-working-dir"
  );
});

test("test shell input", () => {
  const env: { [key: string]: string } = { ...process.env } as {
    [key: string]: string;
  };
  env["INPUT_RUN"] = "shopt -q login_shell && echo 'login shell'";
  env["INPUT_SHELL"] = "bash -l {0}";
  const options: ExecFileSyncOptions = {
    env: env,
  };

  const np = process.execPath;
  const ip = path.join(__dirname, "..", "lib", "main.js");
  expect(execFileSync(np, [ip], options).toString()).toContain("login shell");
});

test("test shell input middle", () => {
  const env: { [key: string]: string } = { ...process.env } as {
    [key: string]: string;
  };
  env["INPUT_RUN"] = "shopt -q login_shell && echo 'login shell'";
  env["INPUT_SHELL"] = "bash -l {0} -e";
  const options: ExecFileSyncOptions = {
    env: env,
  };

  const np = process.execPath;
  const ip = path.join(__dirname, "..", "lib", "main.js");
  expect(execFileSync(np, [ip], options).toString()).toContain("login shell");
});

test("test failing command", () => {
  const env: { [key: string]: string } = { ...process.env } as {
    [key: string]: string;
  };
  // comand 2 of 3 will fail, script should fail
  env["INPUT_RUN"] =
    "echo 'command before'\ntest 1 -eq 2\necho 'command after'";
  const options: ExecFileSyncOptions = {
    env: env,
  };

  const np = process.execPath;
  const ip = path.join(__dirname, "..", "lib", "main.js");
  expect(() => execFileSync(np, [ip], options)).toThrow();
  try {
    execFileSync(np, [ip], options);
  } catch (error) {
    const e = error as SpawnSyncReturns<string>;
    expect(e.stdout.toString()).toContain("'command before'");
    expect(e.stdout.toString()).not.toContain("'command after'");
  }
});
