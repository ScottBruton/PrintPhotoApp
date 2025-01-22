param(
    [Parameter(Mandatory=$true)]
    [string]$InstallerPath,
    
    [Parameter(Mandatory=$true)]
    [string]$ParentPID
)

# Set up logging to use the same log file as update-checker.js
$logPath = Join-Path $env:TEMP "PrintPhotoApp-UpdateChecker.log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
    $logMessage = "[$timestamp] [PowerShell] $Message"
    Add-Content -Path $logPath -Value $logMessage
    Write-Host $Message
}

Write-Log "PowerShell script started with elevated privileges"
Write-Log "Script running as user: $([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)"
Write-Log "Installer path: $InstallerPath"
Write-Log "Parent PID: $ParentPID"

try {
    # Verify installer exists
    if (-not (Test-Path $InstallerPath)) {
        Write-Log "ERROR: Installer not found at: $InstallerPath"
        exit 1
    }
    Write-Log "Installer file exists"

    # Start the installer and wait for it to complete
    Write-Log "Starting installer process..."
    $process = Start-Process -FilePath $InstallerPath -ArgumentList "/SILENT" -Wait -PassThru
    Write-Log "Installer process completed with exit code: $($process.ExitCode)"
    
    # Signal the parent process to quit
    Write-Log "Signaling parent process to quit"
    Write-Host "SIGNAL_QUIT_APP"
    
    # Find the updated application
    $appPath = "C:\Program Files\PrintPhotoApp\PrintPhotoApp.exe"
    if (Test-Path $appPath) {
        Write-Log "Starting updated application: $appPath"
        Start-Process -FilePath $appPath
        Write-Log "Application started"
    } else {
        Write-Log "ERROR: Could not find application at $appPath"
    }

    # Clean up: Delete this script
    Write-Log "Cleaning up update script"
    Remove-Item -Path $MyInvocation.MyCommand.Definition -Force

    Write-Log "Update script finished successfully"
    exit 0
} catch {
    Write-Log "ERROR: $_"
    Write-Log "Stack Trace: $($_.ScriptStackTrace)"
    exit 1
}
