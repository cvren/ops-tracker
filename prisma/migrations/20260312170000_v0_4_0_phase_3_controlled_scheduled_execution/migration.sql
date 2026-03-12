CREATE UNIQUE INDEX "RecurringExecution_slot_claim_key"
ON "RecurringExecution" ("recurringScheduleId", "scheduledFor")
WHERE "status" IN ('RUNNING', 'SUCCESS', 'SKIPPED');
