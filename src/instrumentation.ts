/**
 * Next.js 16 server-boot hook. Runs once per server process. We use this to
 * wire the Wave 2 first-public-harvest handler without creating an import
 * cycle between harvests.ts and referrals.ts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setOnFirstPublicHarvest } = await import("@/lib/harvests");
    const { awardReferrerIfEligible } = await import("@/lib/referrals");
    setOnFirstPublicHarvest(async (ctx) => {
      await awardReferrerIfEligible(ctx);
    });
  }
}
