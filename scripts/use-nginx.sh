#!/bin/bash

# Stop Apache and use nginx for ApexTime

echo "=== Stopping Apache ==="
sudo systemctl stop apache2
sudo systemctl disable apache2

echo ""
echo "=== Starting ApexTime on port 80 ==="
<<<<<<< HEAD
cd /docker/apextime-saas/apextime
=======
cd /docker/apextime/apextime
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "=== Status ==="
docker-compose -f docker-compose.prod.yml ps

echo ""
<<<<<<< HEAD
echo "ApexTime should now be accessible at: http://saas.apextime.in"
=======
echo "ApexTime should now be accessible at: http://ksipl.apextime.in"
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
echo ""
echo "To restart Apache later, run: sudo systemctl start apache2"
