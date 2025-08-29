/*
  Warnings:

  - Added the required column `weekDay` to the `AgendaDay` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."AgendaDay" ADD COLUMN     "weekDay" INTEGER NOT NULL;
