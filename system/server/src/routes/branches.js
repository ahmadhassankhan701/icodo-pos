import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { writeAudit } from "../lib/auditLog.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const branches = await prisma.branch.findMany({
    where: { organizationId: req.user.organizationId },
    orderBy: { name: "asc" },
  });
  res.json(branches);
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { name, nameEn, address } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "اسم الفرع مطلوب" });

  const org = await prisma.organization.findUnique({
    where: { id: req.user.organizationId },
    select: { maxBranches: true, plan: true },
  });
  const maxBranches = org?.maxBranches ?? 3;
  const count = await prisma.branch.count({
    where: { organizationId: req.user.organizationId },
  });
  if (count >= maxBranches) {
    return res.status(403).json({
      error:
        org?.plan === "PREMIUM"
          ? `تم بلوغ الحد الأقصى للفروع (${maxBranches})`
          : `الخطة الحالية تسمح بـ ${maxBranches} فروع فقط. رقِّ الخطة لإضافة المزيد.`,
      code: "BRANCH_LIMIT",
      maxBranches,
      branchCount: count,
    });
  }

  const b = await prisma.branch.create({
    data: {
      organizationId: req.user.organizationId,
      name: name.trim(),
      nameEn: nameEn?.trim() || null,
      address: address?.trim() || null,
    },
  });
  await writeAudit({
    userId: req.user.sub,
    action: "BRANCH_CREATE",
    entityType: "Branch",
    entityId: b.id,
    branchId: b.id,
    summary: `Created branch "${b.name}"`,
    meta: { name: b.name, plan: org?.plan, maxBranches },
  });
  res.status(201).json(b);
});

router.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  const { name, nameEn, address, supabaseId } = req.body || {};
  const existing = await prisma.branch.findFirst({
    where: { id: req.params.id, organizationId: req.user.organizationId },
  });
  if (!existing) return res.status(404).json({ error: "الفرع غير موجود" });
  const data = {
    ...(name != null && { name: String(name).trim() }),
    ...(nameEn !== undefined && { nameEn: nameEn?.trim() || null }),
    ...(address !== undefined && { address: address?.trim() || null }),
  };
  if (supabaseId !== undefined) {
    const s = supabaseId != null && String(supabaseId).trim() ? String(supabaseId).trim() : null;
    data.supabaseId = s;
  }
  const b = await prisma.branch.update({
    where: { id: existing.id },
    data,
  });
  await writeAudit({
    userId: req.user.sub,
    action: "BRANCH_UPDATE",
    entityType: "Branch",
    entityId: b.id,
    branchId: b.id,
    summary: `Updated branch "${b.name}"`,
    meta: { changes: Object.keys(data) },
  });
  res.json(b);
});

export default router;
