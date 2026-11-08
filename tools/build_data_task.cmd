@echo off
rem Task Scheduler wrapper (G-remote-heavy): full image pass of build_data.py --strict -> tools\build_data.log + .done
cd /d "%~dp0.."
del /q tools\build_data.done 2>nul
"C:\Python314\python.exe" -X utf8 tools\build_data.py --strict > tools\build_data.log 2>&1
echo rc=%errorlevel% > tools\build_data.done
