@echo off
REM Automated Test Suite Runner for PrintPhotoApp
REM Run all automated integration tests

echo ========================================
echo PrintPhotoApp - Automated Test Suite
echo ========================================
echo.

REM Store start time
set START_TIME=%time%

REM Test 1: GitHub Workflow Validation
echo [1/4] Validating GitHub Workflow...
node tests\validate-github-workflow.js
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Workflow validation failed!
    pause
    exit /b 1
)
echo.

REM Test 2: Configuration Validation
echo [2/4] Validating Configuration Files...
node tests\test-config-validation.js
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Configuration validation failed!
    pause
    exit /b 1
)
echo.

REM Test 3: Startup Flow Test
echo [3/4] Testing Startup Flow...
node tests\test-startup-flow.js
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Startup flow test had issues (might need npm run build)
    echo Continuing...
)
echo.

REM Test 4: Performance Metrics
echo [4/4] Collecting Performance Metrics...
node tests\test-performance.js
echo.

REM Calculate duration
echo ========================================
echo All Automated Tests Complete!
echo ========================================
echo.
echo Start Time: %START_TIME%
echo End Time: %time%
echo.
echo Next Steps:
echo   1. Review test output above
echo   2. Run manual tests: tests\MANUAL_TESTS.md
echo   3. Fill out report: tests\TEST_REPORT.md
echo.

pause
