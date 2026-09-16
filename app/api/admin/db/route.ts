import { z } from "zod";

import {
  deleteAdminRow,
  listAdminTables,
  readAdminTable,
  updateAdminRow,
} from "@/lib/admin/inspect";
import { clientIdOf, isRateLimited } from "@/lib/api/rate-limit";
import {
  errorResponse,
  jsonNoStore,
  unknownErrorResponse,
} from "@/lib/api/respond";
import { SyncError } from "@/lib/binance/errors";
import { requireAdminId } from "@/lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  table: z.string().max(64).optional(),
  offset: z.coerce.number().int().min(0).max(1_000_000).optional(),
  q: z.string().max(80).optional(),
});

const pkSchema = z
  .record(z.string().max(64), z.string().max(256))
  .refine((value) => Object.keys(value).length > 0 && Object.keys(value).length <= 4);

const mutateSchema = z.object({
  table: z.string().max(64),
  pk: pkSchema,
  patch: z
    .record(
      z.string().max(64),
      z.union([z.string().max(8000), z.number(), z.boolean(), z.null()])
    )
    .optional(),
});

function adminFail(error: unknown) {
  if (error instanceof SyncError) return unknownErrorResponse(error);
  if (error instanceof Error && error.message && !error.message.includes("SQLITE")) {
    return errorResponse("INVALID_BODY", error.message, 400);
  }
  return unknownErrorResponse(error);
}

export async function GET(request: Request) {
  try {
    await requireAdminId();

    if (
      isRateLimited(`admin-db:${clientIdOf(request)}`, {
        windowMs: 60_000,
        max: 80,
      })
    ) {
      return errorResponse(
        "RATE_LIMITED",
        "조회 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        429
      );
    }

    const parsed = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries())
    );
    if (!parsed.success) {
      return errorResponse("INVALID_BODY", "조회 조건을 확인해 주세요.", 400);
    }

    if (!parsed.data.table) {
      return jsonNoStore({ ok: true as const, ...listAdminTables() }, 200);
    }

    return jsonNoStore(
      {
        ok: true as const,
        page: readAdminTable({
          table: parsed.data.table,
          offset: parsed.data.offset,
          q: parsed.data.q,
        }),
      },
      200
    );
  } catch (error) {
    return adminFail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminId();
    if (
      isRateLimited(`admin-db-write:${clientIdOf(request)}`, {
        windowMs: 60_000,
        max: 40,
      })
    ) {
      return errorResponse(
        "RATE_LIMITED",
        "수정 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        429
      );
    }

    const parsed = mutateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success || !parsed.data.patch) {
      return errorResponse("INVALID_BODY", "수정할 값을 확인해 주세요.", 400);
    }

    updateAdminRow({
      table: parsed.data.table,
      pk: parsed.data.pk,
      patch: parsed.data.patch,
    });
    return jsonNoStore({ ok: true as const }, 200);
  } catch (error) {
    return adminFail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const actorId = await requireAdminId();
    if (
      isRateLimited(`admin-db-write:${clientIdOf(request)}`, {
        windowMs: 60_000,
        max: 40,
      })
    ) {
      return errorResponse(
        "RATE_LIMITED",
        "삭제 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        429
      );
    }

    const parsed = mutateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return errorResponse("INVALID_BODY", "삭제할 행을 확인해 주세요.", 400);
    }

    deleteAdminRow({
      table: parsed.data.table,
      pk: parsed.data.pk,
      actorId,
    });
    return jsonNoStore({ ok: true as const }, 200);
  } catch (error) {
    return adminFail(error);
  }
}
