import * as core from "@actions/core";
import * as exec from "@actions/exec";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function installDeps(env: { [key: string]: string }) {
  // TODO: add imagemagick for dump/convert the buffer
  const options: exec.ExecOptions = { env: env };

  console.log("::group::install linux_pkgs");
  const linux_pkgs = core.getInput("linux_pkgs", { required: false });
  const pkgs = ["xvfb", ...linux_pkgs.split(" ")];
  console.log(`installing ${pkgs}`);

  await exec.exec("sudo apt-get", ["update"], options);
  await exec.exec(
    "sudo apt-get",
    ["install", "-y", "--no-install-recommends", ...pkgs],
    options
  );
  console.log("::endgroup::");
}

async function linuxSetup(env: { [key: string]: string }) {
  console.log("::group::running linux_setup");
  const linux_setup = core.getInput("linux_setup", { required: false });
  const linux_setup_delay = +core.getInput("linux_setup_delay", {
    required: false,
  });
  const options: exec.ExecOptions = { env: env };
  await exec.exec(
    "bash",
    ["-c", `${linux_setup} > /tmp/linux-setup-output 2>&1 &`],
    options
  );
  console.log(`sleep for ${linux_setup_delay}ms`);
  await sleep(linux_setup_delay);
  console.log("::endgroup::");
}

async function linuxTeardown(env: { [key: string]: string }) {
  console.log("::group::running linux_teardown");
  const linux_teardown = core.getInput("linux_teardown", { required: false });
  const options: exec.ExecOptions = { env: env };
  await exec.exec(
    "bash",
    ["-c", `${linux_teardown} > /tmp/linux-teardown-output 2>&1 &`],
    options
  );
  console.log("::endgroup::");
}

async function startXvfb(env: { [key: string]: string }): Promise<string[]> {
  console.log("::group::starting XVfb");
  const options: exec.ExecOptions = { env: env };
  const output: exec.ExecOutput = await exec.getExecOutput(
    "bash",
    [`${__dirname}/start-xvfb.bash`],
    options
  );
  if (output.exitCode == 0) {
    const result = output.stdout.split("\n");
    console.log("sleep for 1000ms");
    await sleep(1000);
    return [result[0], result[1]];
  } else {
    throw new Error(`failed to start Xvfb, exit code '${output.exitCode}'`);
  }
  console.log("::endgroup::");
}

async function killAllXvfb(sig = 15) {
  await exec.exec("sudo pkill", [`-${sig}`, "^Xvfb"]);
}

async function runCommands(commands: string[], env: { [key: string]: string }) {
  const options: exec.ExecOptions = { env: env };
  for (const command of commands) {
    // TODO: raise error if any fail (is this already done?)
    await exec.exec(command, [], options);
  }
}

async function main() {
  try {
    const commands = core.getMultilineInput("run", { required: true });

    const env: { [key: string]: string } = { ...process.env } as {
      [key: string]: string;
    };

    console.log(`running on ${process.platform}`);

    if (process.platform == "linux") {
      await installDeps(env);
      const [pid, display] = await startXvfb(env);
      console.log(`xvfb pid=${pid}, display=${display}`);
      env.DISPLAY = `:${display}`;
      await linuxSetup(env);
    }

    await runCommands(commands, env);

    if (process.platform == "linux") {
      await linuxTeardown(env);
      await killAllXvfb();
    }
  } catch (error) {
    // TODO: mock this shit for tests
    if (error instanceof Error) core.setFailed(error.message);
    if (error instanceof Error) console.log(error.message);
    // attempt to kill any remaining Xvfb - noop if there's an error at this point
    try {
      await killAllXvfb(9);
    } catch (error) {
      () => undefined;
    }
  }
}

main();
