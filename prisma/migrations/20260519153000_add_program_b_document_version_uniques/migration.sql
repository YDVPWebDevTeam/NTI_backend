CREATE UNIQUE INDEX "uq_pb_backlog_doc_version"
ON "ProgramBBacklogDocument"("backlogItemId", "category", "version");

CREATE UNIQUE INDEX "uq_pb_project_doc_version"
ON "ProgramBProjectDocument"("projectId", "category", "version");
