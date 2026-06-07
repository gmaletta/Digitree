@echo off
setlocal
cd /d "%~dp0"

echo ===============================================
echo  DIGIMON EVOLUTION TREE - AVVIO ONE CLICK
echo ===============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERRORE: Node.js non risulta installato.
  echo Scarica e installa Node.js LTS da https://nodejs.org/
  echo Poi rilancia questo file .cmd.
  pause
  exit /b 1
)

node -e "const major=Number(process.versions.node.split('.')[0]); if(major<18){console.error('ERRORE: serve Node.js 18 o superiore. Versione attuale: '+process.version); process.exit(1)}"
if errorlevel 1 (
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installo le dipendenze Node...
  call npm install
  if errorlevel 1 (
    echo ERRORE durante npm install.
    pause
    exit /b 1
  )
) else (
  echo Dipendenze gia' presenti.
)

echo.
echo Genero Excel arricchito e JSON del sito...
echo Questa fase visita Wikimon una sola volta per ogni Digimon.
echo Se viene interrotta, il cache permette di riprendere piu' velocemente.
echo.

call npm run enrich
if errorlevel 1 (
  echo.
  echo ERRORE durante la generazione dei dati.
  pause
  exit /b 1
)

echo.
echo Apro il sito in locale...
start "" "http://localhost:8080"
call npm run serve

pause
