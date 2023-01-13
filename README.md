# headless-gui
Run cross-platform commands for headless GUI testing

This is similar to https://github.com/GabrielBB/xvfb-action (at least in purpose), but with a few differences:

1. runs on node16, silencing GitHub deprecation warnings
2. doesn't use xvfb-run, instead runs xvfb once for all commands
3. by default installs and starts a minimal window manager (see [pytest-qt troubleshooting](https://pytest-qt.readthedocs.io/en/latest/troubleshooting.html#xvfb-assertionerror-timeouterror-when-using-waituntil-waitexposed-and-ui-events) for info on why)
4. allows installing additional linux dependencies and customizing setup/teardown commands
