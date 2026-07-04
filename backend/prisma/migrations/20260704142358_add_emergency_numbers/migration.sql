-- CreateTable
CREATE TABLE "emergency_numbers" (
    "id" UUID NOT NULL,
    "region" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_numbers_pkey" PRIMARY KEY ("id")
);
