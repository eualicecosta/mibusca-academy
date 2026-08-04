/**
 * Lightweight save-performance helpers (prompt27 audit).
 * No PII / content logging. Safe for production structured logs.
 */

export type SavePerfTimings = {
  authMs: number;
  validationMs: number;
  existingReadMs: number;
  transactionMs: number;
  lessonUpdateMs: number;
  blocksDeleteMs: number;
  blocksReorderMs: number;
  blocksWriteMs: number;
  checklistMs: number;
  finalReadMs: number;
  revalidationMs: number;
  totalMs: number;
  queryCount: number;
  blocksCreated: number;
  blocksUpdated: number;
  blocksDeleted: number;
  checklistItemsUpdated: number;
  r2Called: boolean;
  orderChanged: boolean;
  payloadBytesApprox: number;
  blockCount: number;
  checklistCount: number;
};

export function newSaveTraceId() {
  return `save_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function approxPayloadBytes(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}

export class PerfClock {
  private marks = new Map<string, number>();
  private queryCount = 0;

  mark(name: string) {
    this.marks.set(name, performance.now());
  }

  ms(from: string, to?: string) {
    const a = this.marks.get(from);
    const b = to ? this.marks.get(to) : performance.now();
    if (a == null || b == null) return 0;
    return Math.round(b - a);
  }

  countQuery(n = 1) {
    this.queryCount += n;
  }

  get queries() {
    return this.queryCount;
  }
}

export function logLessonSavePerformance(payload: {
  saveTraceId: string;
  lessonId: string;
  success: boolean;
  code?: string;
  timings: Partial<SavePerfTimings> & { totalMs: number };
}) {
  console.info(
    JSON.stringify({
      event: "lesson_save_performance",
      saveTraceId: payload.saveTraceId,
      lessonId: payload.lessonId,
      success: payload.success,
      code: payload.code,
      totalMs: payload.timings.totalMs,
      authMs: payload.timings.authMs ?? 0,
      validationMs: payload.timings.validationMs ?? 0,
      existingReadMs: payload.timings.existingReadMs ?? 0,
      transactionMs: payload.timings.transactionMs ?? 0,
      lessonUpdateMs: payload.timings.lessonUpdateMs ?? 0,
      blocksDeleteMs: payload.timings.blocksDeleteMs ?? 0,
      blocksReorderMs: payload.timings.blocksReorderMs ?? 0,
      blocksWriteMs: payload.timings.blocksWriteMs ?? 0,
      checklistMs: payload.timings.checklistMs ?? 0,
      finalReadMs: payload.timings.finalReadMs ?? 0,
      revalidationMs: payload.timings.revalidationMs ?? 0,
      queryCount: payload.timings.queryCount ?? 0,
      blocksCreated: payload.timings.blocksCreated ?? 0,
      blocksUpdated: payload.timings.blocksUpdated ?? 0,
      blocksDeleted: payload.timings.blocksDeleted ?? 0,
      checklistItemsUpdated: payload.timings.checklistItemsUpdated ?? 0,
      r2Called: payload.timings.r2Called ?? false,
      orderChanged: payload.timings.orderChanged ?? false,
      payloadBytesApprox: payload.timings.payloadBytesApprox ?? 0,
      blockCount: payload.timings.blockCount ?? 0,
      checklistCount: payload.timings.checklistCount ?? 0
    })
  );
}
