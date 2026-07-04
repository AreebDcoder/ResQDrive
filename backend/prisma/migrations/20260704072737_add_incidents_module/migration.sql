-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('NONE', 'MINOR', 'MODERATE', 'SEVERE');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'FALSE_ALARM', 'ARCHIVED');

-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "IncidentType" NOT NULL DEFAULT 'MANUAL',
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'NONE',
    "status" "IncidentStatus" NOT NULL DEFAULT 'ACTIVE',
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "description" TEXT,
    "sensorSnapshot" JSONB,
    "alert_dispatch_status" JSONB,
    "damage_assessment_result" JSONB,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incidents_user_id_occurred_at_idx" ON "incidents"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "incidents_severity_idx" ON "incidents"("severity");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
