#!/bin/sh

# Wait for postgres to be ready
echo "Waiting for PostgreSQL..."
while ! nc -z postgres 5432; do
  sleep 1
done
echo "PostgreSQL is ready!"

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy || npx prisma migrate dev --name init --create-only || true
npx prisma db push --accept-data-loss || true

# Seed default data
echo "Seeding default data..."
npm run seed || true

# Start the app
echo "Starting application..."
npm start
