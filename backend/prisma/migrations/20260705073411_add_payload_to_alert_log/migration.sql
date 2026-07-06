/*
  Warnings:

  - Added the required column `payload` to the `alert_dispatch_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "alert_dispatch_logs" ADD COLUMN     "payload" JSONB NOT NULL;
