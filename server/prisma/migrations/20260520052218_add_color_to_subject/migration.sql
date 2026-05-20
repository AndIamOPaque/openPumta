-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#f97316',
ADD COLUMN     "goalWorkSecs" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DailyRating" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyRating_userId_date_key" ON "DailyRating"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyRating" ADD CONSTRAINT "DailyRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
