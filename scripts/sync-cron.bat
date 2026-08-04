@echo off
cd /d "c:\Users\diana\OneDrive\Desktop\farmatic.ro"
echo. >> logs\cron-sync.log
echo ===== %date% %time% ===== >> logs\cron-sync.log
call npx tsx scripts\syncAllFeeds.ts >> logs\cron-sync.log 2>&1
