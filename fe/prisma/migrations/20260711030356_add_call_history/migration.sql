-- CreateTable
CREATE TABLE "CallHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "peerId" TEXT,
    "peerUsername" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallHistory_userId_createdAt_idx" ON "CallHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CallHistory_roomId_idx" ON "CallHistory"("roomId");

-- CreateIndex
CREATE INDEX "CallHistory_peerId_idx" ON "CallHistory"("peerId");

-- AddForeignKey
ALTER TABLE "CallHistory" ADD CONSTRAINT "CallHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallHistory" ADD CONSTRAINT "CallHistory_peerId_fkey" FOREIGN KEY ("peerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallHistory" ADD CONSTRAINT "CallHistory_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
