const { spawn } = require('child_process');
const path = require('path');

function runTestGui(ScriptPath, installPath) {
    console.log("\n In Script Path: ", ScriptPath);
    // Path to the PowerShell script
    const psScriptPath = ScriptPath.split('\\').join('\\\\');
    const installerPath = installPath.split('\\').join('\\\\');

    console.log("Starting PowerShell test...");
    console.log("Script path:", psScriptPath);
    console.log("Installer path:", installerPath);

    // Create PowerShell process
    const ps = spawn(
    "powershell.exe",
    [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        psScriptPath,
        "-InstallerPath",
        installerPath,
    ],
    {
        stdio: "pipe",
        windowsHide: false,
    }
    );

    // Handle PowerShell output
    ps.stdout.on("data", (data) => {
    console.log("PowerShell output:", data.toString());
    });

    // Handle PowerShell errors
    ps.stderr.on("data", (data) => {
    console.error("PowerShell error:", data.toString());
    });

    // Handle process exit
    ps.on("close", (code) => {
    console.log("PowerShell process exited with code:", code);
    });

    // Handle process errors
    ps.on("error", (err) => {
    console.error("Failed to start PowerShell:", err);
    });

}

module.exports = runTestGui;
