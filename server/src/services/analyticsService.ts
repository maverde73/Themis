import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";

export async function getAnalytics(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new AppError(404, "Organization not found");

  const reports = await prisma.reportMetadata.findMany({ where: { orgId } });

  const byChannel = { pdr125: 0, whistleblowing: 0 };
  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let slaAckMet = 0;
  let slaAckTotal = 0;
  let slaResponseMet = 0;
  let slaResponseTotal = 0;

  for (const r of reports) {
    if (r.channel === "PDR125") byChannel.pdr125++;
    else byChannel.whistleblowing++;

    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (r.category) byCategory[r.category] = (byCategory[r.category] || 0) + 1;

    if (r.slaAckMet !== null) {
      slaAckTotal++;
      if (r.slaAckMet) slaAckMet++;
    }
    if (r.slaResponseMet !== null) {
      slaResponseTotal++;
      if (r.slaResponseMet) slaResponseMet++;
    }
  }

  return {
    total: reports.length,
    byChannel,
    byStatus,
    byCategory,
    sla: {
      ackComplianceRate: slaAckTotal > 0 ? slaAckMet / slaAckTotal : null,
      responseComplianceRate: slaResponseTotal > 0 ? slaResponseMet / slaResponseTotal : null,
      ackMet: slaAckMet,
      ackTotal: slaAckTotal,
      responseMet: slaResponseMet,
      responseTotal: slaResponseTotal,
    },
  };
}
