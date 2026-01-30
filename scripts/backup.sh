#!/bin/bash

# Configuration
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
LOG_FILE="/docker/apextime/backups/backup_system.log"
BACKUP_DIR="/docker/apextime/backups"
DB_CONTAINER="apextime-postgres"
DB_NAME="apextime"
DB_USER="apextime"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="backup_${DB_NAME}_${TIMESTAMP}.sql"
GDRIVE_REMOTE="drive"
GDRIVE_FOLDER="Apextime_Backups"

# Ensure log file exists
touch $LOG_FILE

{
echo "-----------------------------------------------------"
echo "[$(date)] SYSTEM: Starting automated backup job..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# 1. Generate the SQL Dump from Docker
echo "[$(date)] Starting Database Dump..."
docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/$FILENAME

# 2. Compress the backup to save space and bandwidth
gzip $BACKUP_DIR/$FILENAME
FILE_GZ="$BACKUP_DIR/${FILENAME}.gz"

# 3. Push to Google Drive using rclone
if command -v rclone &> /dev/null
then
    echo "[$(date)] Pushing to Google Drive ($GDRIVE_FOLDER)..."
    rclone copy $FILE_GZ $GDRIVE_REMOTE:$GDRIVE_FOLDER
    
    if [ $? -eq 0 ]; then
        echo "[$(date)] SUCCESS: Backup uploaded to Google Drive."
    else
        echo "[$(date)] ERROR: Google Drive upload failed."
    fi
else
    echo "[$(date)] SKIPPED: rclone not installed. Backup remains local only."
fi

# 4. Retention: Delete local backups older than 7 days (Gdrive keeps its own)
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +7 -delete

echo "[$(date)] Backup process finished."
echo "-----------------------------------------------------"
} >> $LOG_FILE 2>&1
