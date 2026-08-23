@echo off
rem ===========================================================================
rem CompileBytecodeNative - Compilation du banc C++ bytecode sous Windows
rem ---------------------------------------------------------------------------
rem Ce script charge Visual Studio puis compile uniquement le banc d'essai. Il
rem ne modifie ni le firmware source ni la configuration Particle.
rem ===========================================================================

call "%~1" -arch=x64 >nul
if errorlevel 1 exit /b %errorlevel%

cl /nologo /std:c++14 /EHsc "%~2" /Fe:"%~3" /Fo:"%~4"
exit /b %errorlevel%
