param(
    [Parameter(Mandatory=$true)]
    [string]$InstallerPath
)

# Set up logging
$logPath = Join-Path $env:TEMP "PrintPhotoApp-Update.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Write-Log {
    param($Message)
    $logMessage = "[$timestamp] $Message"
    Add-Content -Path $logPath -Value $logMessage
    Write-Host $logMessage
}

Write-Log "Update script started"
Write-Log "Installer Path: $InstallerPath"

Add-Type -AssemblyName PresentationFramework

# Define GUI
[void][System.Reflection.Assembly]::LoadWithPartialName("System.Drawing")
[void][System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms")

Write-Log "Creating GUI elements..."

# Add Windows API function to force foreground window
Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class Win32 {
        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool SetForegroundWindow(IntPtr hWnd);
        
        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    }
"@

$form = New-Object System.Windows.Forms.Form
$form.Text = "Update Progress"
$form.Size = New-Object System.Drawing.Size(400, 300)
$form.StartPosition = "CenterScreen"
$form.TopMost = $true
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.Visible = $false  # Explicitly set form to not visible initially

# Force window to foreground
[Win32]::SetForegroundWindow($form.Handle)
[Win32]::ShowWindow($form.Handle, 9) # SW_RESTORE = 9

# Create ProgressBar
$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(10, 20)
$progressBar.Size = New-Object System.Drawing.Size(360, 30)
$progressBar.Minimum = 0
$progressBar.Maximum = 100
$progressBar.Step = 20
$form.Controls.Add($progressBar)

# Create Labels for Steps
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Location = New-Object System.Drawing.Point(10, 60)
$statusLabel.Size = New-Object System.Drawing.Size(360, 40)
$statusLabel.Text = "Waiting for PrintPhotoApp.exe to close..."
$form.Controls.Add($statusLabel)

# Create Scrollable Error Box
$errorBox = New-Object System.Windows.Forms.TextBox
$errorBox.Location = New-Object System.Drawing.Point(10, 110)
$errorBox.Size = New-Object System.Drawing.Size(360, 100)
$errorBox.Multiline = $true
$errorBox.ScrollBars = "Vertical"
$errorBox.ReadOnly = $true
$form.Controls.Add($errorBox)

# Create Confirm Button
$confirmButton = New-Object System.Windows.Forms.Button
$confirmButton.Location = New-Object System.Drawing.Point(140, 220)
$confirmButton.Size = New-Object System.Drawing.Size(120, 30)
$confirmButton.Text = "Confirm"
$confirmButton.Enabled = $false
$form.Controls.Add($confirmButton)

Write-Log "GUI elements created"

# Logic Steps
Start-Sleep -Seconds 2
$statusLabel.Text = "Checking if PrintPhotoApp.exe is running..."
Write-Log "Checking for running instances of PrintPhotoApp.exe"
$progressBar.PerformStep()

# Wait for application to close
do {
    Start-Sleep -Milliseconds 500
    $appRunning = Get-Process -Name "PrintPhotoApp" -ErrorAction SilentlyContinue
    if ($appRunning) {
        Write-Log "PrintPhotoApp.exe is still running..."
    }
} while ($appRunning)

Write-Log "PrintPhotoApp.exe is no longer running"
$statusLabel.Text = "Executing the update..."
$progressBar.PerformStep()

# Execute update
try {
    Write-Log "Starting installer: $InstallerPath"
    Start-Process -FilePath $InstallerPath -ArgumentList "/S" -Wait
    Write-Log "Installer completed"
    $statusLabel.Text = "Waiting for the update to complete..."
    $progressBar.PerformStep()
} catch {
    $errorMessage = "Error during update: $($_.Exception.Message)"
    Write-Log $errorMessage
    $errorBox.Text += "$errorMessage`r`n"
}

# Locate application
Start-Sleep -Seconds 2
$statusLabel.Text = "Locating application..."
Write-Log "Searching for updated application"
$progressBar.PerformStep()
$appPath = Get-ChildItem "C:\Program Files*\PrintPhotoApp\PrintPhotoApp.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1

if ($appPath) {
    Write-Log "Found application at: $($appPath.FullName)"
    $statusLabel.Text = "Found application at: $($appPath.FullName)"
    $progressBar.PerformStep()
} else {
    $errorMessage = "Error: Application not found"
    Write-Log $errorMessage
    $statusLabel.Text = $errorMessage
    $errorBox.Text += "Error: Could not find PrintPhotoApp.exe.`r`n"
    $progressBar.Value = $progressBar.Maximum
}

# Wait for user confirmation
$statusLabel.Text = "Update Complete :)"
Write-Log "Update process completed"
$confirmButton.Enabled = $true
$confirmButton.Add_Click({
    if ($appPath) {
        Write-Log "Waiting for installer to finish..."
        Start-Sleep -Seconds 5  # Add 5 second delay
        Write-Log "Starting updated application: $($appPath.FullName)"
        try {
            Start-Process -FilePath $appPath.FullName -ErrorAction Stop
            Write-Log "Application started successfully"
        } catch {
            Write-Log "Error starting application: $($_.Exception.Message)"
        }
    }
    Write-Log "Closing update window"
    $form.Close()
    # Clean up: Delete this script
    Write-Log "Cleaning up update script"
    Remove-Item -Path $MyInvocation.MyCommand.Definition -Force
})

Write-Log "Showing update window"
$form.ShowDialog()
Write-Log "Update script finished"
