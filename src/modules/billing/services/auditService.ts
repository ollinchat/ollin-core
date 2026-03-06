/**
 * Audit logging for document actions. All actions are appended to document.auditTrail.
 */

import * as vault from "../vault/documentVault";
import type { AuditAction } from "../types";

export function logViewed(userId: string, docId: string): void {
  vault.logAudit(userId, docId, "viewed");
}

export function logDownloaded(userId: string, docId: string): void {
  vault.logAudit(userId, docId, "downloaded");
}

export function logShared(userId: string, docId: string, note?: string): void {
  vault.logAudit(userId, docId, "shared", note);
}

export function logSigned(userId: string, docId: string): void {
  vault.logAudit(userId, docId, "signed");
}
