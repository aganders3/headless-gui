import * as core from "@actions/core";
import * as exec from "@actions/exec";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Given a GitHub actions input name, get the value using either kebab-case
 * (preferred) or snake_case. If neither is found, return empty string.
 *
 * @remarks
 * If you *don't* want to fall back to checking the snake_case name, just use
 * core.getInput directly.
 *
 * @param inputName - The name of the input (kebab-case)
 * @param required - whether the input is required or optional [false]
 */
function getInputCompatible(input_name: string, required = false) {
  core.debug(`getting input "${input_name}"`);
  const val = core.getInput(input_name, { required: required });
  const snake_name = input_name.replace(/-/g, "_");
  const snake_val = core.getInput(snake_name, { required: required });
  core.debug(`\t${input_name}: "${val}"`);
  core.debug(`\t${snake_name}: "${snake_val}"`);
  return val ? val : snake_val;
}

async function installDeps(env: { [key: string]: string }) {
  // TODO: add imagemagick for dump/convert the buffer
  const options: exec.ExecOptions = { env: env };

  console.log("::group::install linux_pkgs");
  const linux_pkgs = getInputCompatible("linux-pkgs");
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
  const linux_setup = getInputCompatible("linux-setup");
  const linux_setup_delay = +getInputCompatible("linux-setup-delay");
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
  const linux_teardown = getInputCompatible("linux-teardown");
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
    console.log("::endgroup::");
    return [result[0], result[1]];
  } else {
    console.log("::endgroup::");
    throw new Error(`failed to start Xvfb, exit code '${output.exitCode}'`);
  }
}

async function killAllXvfb(sig = 15) {
  await exec.exec("sudo pkill", [`-${sig}`, "^Xvfb"]);
}

async function runCommands(commands: string[], env: { [key: string]: string }) {
  const options: exec.ExecOptions = { env: env };

  const working_dir = getInputCompatible("working-directory");
  if (working_dir) {
    options.cwd = working_dir;
  }

  const shell = core.getInput("shell");
  if (shell) {
    const [shell_bin, ...shell_args] = shell.split(" ");
    const placeholderIndex = shell_args.indexOf("{0}");

    for (const command of commands) {
      const args = [...shell_args];
      if (placeholderIndex > 0) {
        args.splice(placeholderIndex, 1, "-c", command);
      } else {
        args.push("-c", command);
      }
      core.debug(`exec: args: ${shell_bin}, args: ${args}`);
      await exec.exec(shell_bin, args, options);
    }
  } else {
    for (const command of commands) {
      await exec.exec(command, [], options);
    }
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
    // TODO: upload /tmp/linux*output on failure?
    if (error instanceof Error) core.setFailed(error.message);
    if (error instanceof Error) console.log(error.message);
    // attempt to kill any remaining Xvfb - noop if there's an error at this point
    try {
      if (process.platform == "linux") {
        await killAllXvfb(9);
      }
    } catch (error) {
      () => undefined;
    }
  }
}

main();
