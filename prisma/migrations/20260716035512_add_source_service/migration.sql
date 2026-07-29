/*
  Warnings:

  - Added the required column `sourceService` to the `audit_events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "audit_events" ADD COLUMN     "sourceService" TEXT NOT NULL;
