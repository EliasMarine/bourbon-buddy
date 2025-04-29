-- CreateTable
CREATE TABLE "StreamTip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "message" TEXT,
    "streamId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StreamTip_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StreamTip_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StreamTip_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StreamTip_streamId_idx" ON "StreamTip"("streamId");

-- CreateIndex
CREATE INDEX "StreamTip_senderId_idx" ON "StreamTip"("senderId");

-- CreateIndex
CREATE INDEX "StreamTip_hostId_idx" ON "StreamTip"("hostId");
