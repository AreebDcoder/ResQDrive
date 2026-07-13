-- CreateEnum
CREATE TYPE "DamageType" AS ENUM ('crack', 'dent', 'glass_shatter', 'lamp_broken', 'scratch', 'tire_flat');

-- CreateEnum
CREATE TYPE "DamageSeverity" AS ENUM ('minor', 'moderate', 'severe');

-- CreateEnum
CREATE TYPE "PartTag" AS ENUM ('front_bumper', 'rear_bumper', 'bonnet', 'left_mirror', 'right_mirror', 'headlight', 'taillight', 'door', 'windshield', 'roof', 'tire', 'other');

-- CreateEnum
CREATE TYPE "RepairAction" AS ENUM ('repair', 'replace');

-- CreateTable
CREATE TABLE "damage_assessments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vehicle_id" UUID,
    "incident_id" UUID,
    "photo_url" TEXT NOT NULL,
    "predicted_damage_type" "DamageType" NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "derived_severity" "DamageSeverity" NOT NULL,
    "inference_time_ms" INTEGER,
    "model_version" VARCHAR(20) NOT NULL DEFAULT 'cardd_v1',
    "part_tag" "PartTag" NOT NULL DEFAULT 'other',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "damage_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_cost_rates" (
    "id" UUID NOT NULL,
    "part_tag" "PartTag" NOT NULL,
    "action" "RepairAction" NOT NULL,
    "min_cost_pkr" INTEGER NOT NULL,
    "max_cost_pkr" INTEGER NOT NULL,

    CONSTRAINT "labor_cost_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts_price_caches" (
    "id" UUID NOT NULL,
    "vehicle_make" VARCHAR(50) NOT NULL,
    "vehicle_model" VARCHAR(50) NOT NULL,
    "vehicle_year" INTEGER NOT NULL,
    "part_tag" "PartTag" NOT NULL,
    "action" "RepairAction" NOT NULL,
    "min_price_pkr" INTEGER NOT NULL,
    "max_price_pkr" INTEGER NOT NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'gemini_ai',
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parts_price_caches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fallback_parts_prices" (
    "id" UUID NOT NULL,
    "part_tag" "PartTag" NOT NULL,
    "action" "RepairAction" NOT NULL,
    "min_price_pkr" INTEGER NOT NULL,
    "max_price_pkr" INTEGER NOT NULL,

    CONSTRAINT "fallback_parts_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_cost_reports" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "incident_id" UUID,
    "vehicle_id" UUID,
    "total_min_cost_pkr" INTEGER NOT NULL,
    "total_max_cost_pkr" INTEGER NOT NULL,
    "line_items" JSONB NOT NULL,
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_cost_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "labor_cost_rates_part_tag_action_key" ON "labor_cost_rates"("part_tag", "action");

-- CreateIndex
CREATE UNIQUE INDEX "parts_price_caches_vehicle_make_vehicle_model_vehicle_year__key" ON "parts_price_caches"("vehicle_make", "vehicle_model", "vehicle_year", "part_tag", "action");

-- CreateIndex
CREATE UNIQUE INDEX "fallback_parts_prices_part_tag_action_key" ON "fallback_parts_prices"("part_tag", "action");

-- AddForeignKey
ALTER TABLE "damage_assessments" ADD CONSTRAINT "damage_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_assessments" ADD CONSTRAINT "damage_assessments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_cost_reports" ADD CONSTRAINT "repair_cost_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_cost_reports" ADD CONSTRAINT "repair_cost_reports_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
