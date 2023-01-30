import * as process from "process";
import {
  execFileSync,
  ExecFileSyncOptions,
  SpawnSyncReturns,
} from "child_process";
import * as path from "path";
import { expect, test } from "@jest/globals";

// shows how the runner will run a javascript action with env / stdout protocol
test("test runs", () => {
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
  env["INPUT_WORKING_DIRECTORY"] = "/tmp";
  const options: ExecFileSyncOptions = {
    env: env,
  };

  const np = process.execPath;
  const ip = path.join(__dirname, "..", "lib", "main.js");
  expect(execFileSync(np, [ip], options).toString()).toContain("/private/tmp");
});

test("test compatibility working dir", () => {
  const env: { [key: string]: string } = { ...process.env } as {
    [key: string]: string;
  };
  env["INPUT_RUN"] = "pwd";
  env["INPUT_WORKING-DIRECTORY"] = "/tmp";
  const options: ExecFileSyncOptions = {
    env: env,
  };

  const np = process.execPath;
  const ip = path.join(__dirname, "..", "lib", "main.js");
  expect(execFileSync(np, [ip], options).toString()).toContain("/private/tmp");
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
