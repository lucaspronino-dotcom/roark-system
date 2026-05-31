@echo off
cd /d "%~dp0..\apps\web"
"C:\Program Files\nodejs\node.exe" "..\..\node_modules\vite\bin\vite.js" --host 0.0.0.0
