!macro customInit
  ; Check if Git is installed
  ReadRegStr $R0 HKLM "SOFTWARE\GitForWindows" "InstallPath"
  ${If} $R0 == ""
    MessageBox MB_YESNO "Git is required but not installed. Would you like to install it now?" IDYES installGit IDNO skipGit
    
    installGit:
      ; Download Git installer using PowerShell
      ExecWait 'powershell -Command "Invoke-WebRequest -Uri https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe -OutFile $TEMP\GitInstaller.exe"'
      
      ; Run Git installer
      ExecWait '"$TEMP\GitInstaller.exe" /VERYSILENT /NORESTART'
      
      ; Clean up
      Delete "$TEMP\GitInstaller.exe"
      
      ; Configure Git and clone repo using PowerShell
      ExecWait 'powershell -Command "git config --global user.name \"ScoBro Prints\""'
      ExecWait 'powershell -Command "git config --global user.email \"your-email@example.com\""'
      ExecWait 'powershell -Command "git clone https://github.com/ScottBruton/PrintPhotoApp.git \"$INSTDIR\repo\""'
      Goto done
      
    skipGit:
      MessageBox MB_OK "Git installation skipped. Some features may not work properly."
      
    done:
  ${EndIf}
!macroend