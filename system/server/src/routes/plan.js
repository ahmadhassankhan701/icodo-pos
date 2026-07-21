import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);
router.use(requireRole("ADMIN"));

router.get("/", async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const [organization, branchCount, userCount] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          plan: true,
          maxBranches: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.branch.count({ where: { organizationId } }),
      prisma.user.count({ where: { organizationId } }),
    ]);

    if (!organization) {
      return res.status(404).json({ error: "Organization not found", code: "NOT_FOUND" });
    }

    let purchases = [];
    try {
      purchases = await prisma.organizationPlanPurchase.findMany({
        where: { organizationId },
        orderBy: [{ purchasedAt: "desc" }, { createdAt: "desc" }],
        take: 200,
      });
    } catch (error) {
      // Keep the current-plan card available before the new migration is deployed.
      if (!["P2021", "P2022"].includes(error?.code)) throw error;
    }

    const atBranchLimit = branchCount >= (organization.maxBranches ?? 3);

    res.json({
      current: {
        ...organization,
        branchCount,
        userCount,
        atBranchLimit,
        branchesRemaining: Math.max(0, (organization.maxBranches ?? 3) - branchCount),
      },
      purchases: purchases.map((purchase) => ({
        ...purchase,
        amount: purchase.amount == null ? null : Number(purchase.amount),
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
