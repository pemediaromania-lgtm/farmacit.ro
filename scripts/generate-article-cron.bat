@echo off
cd /d "c:\Users\diana\OneDrive\Desktop\farmatic.ro"
echo. >> logs\cron-article.log
echo ===== %date% %time% ===== >> logs\cron-article.log
call npx tsx scripts\generateDailyArticle.ts >> logs\cron-article.log 2>&1
