-- CreateIndex: Ensure only one active (non-rejected, non-archived) application per team+call
CREATE UNIQUE INDEX "Application_active_unique_constraint" ON "Application" ("teamId", "callId")
WHERE status NOT IN ('REJECTED', 'ARCHIVED');
