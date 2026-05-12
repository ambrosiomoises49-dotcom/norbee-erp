/*
  Warnings:

  - You are about to drop the column `readAT` on the `Notification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "readAT",
ADD COLUMN     "readAt" TIMESTAMP(3);
