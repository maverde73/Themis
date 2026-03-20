import cron from "node-cron";
import { prisma } from "../utils/prisma";

export interface SlaAlert {
  reportId: string;
  orgId: string;
  channel: string;
  type: "ack_warning" | "ack_overdue" | "response_warning" | "response_overdue";
  daysRemaining: number;
  deadline: Date;
}

async function checkSlaDeadlines(): Promise<SlaAlert[]> {
  const now = new Date();
  const alerts: SlaAlert[] = [];

  const openReports = await prisma.reportMetadata.findMany({
    where: {
      status: { notIn: ["CLOSED_FOUNDED", "CLOSED_UNFOUNDED", "CLOSED_BAD_FAITH"] },
    },
  });

  for (const report of openReports) {
    // Check ack SLA (only for RECEIVED status)
    if (report.status === "RECEIVED" && report.slaAckDeadline) {
      const daysRemaining = Math.ceil(
        (report.slaAckDeadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      if (daysRemaining <= 0) {
        alerts.push({
          reportId: report.id,
          orgId: report.orgId,
          channel: report.channel,
          type: "ack_overdue",
          daysRemaining,
          deadline: report.slaAckDeadline,
        });
      } else if (daysRemaining <= 2) {
        alerts.push({
          reportId: report.id,
          orgId: report.orgId,
          channel: report.channel,
          type: "ack_warning",
          daysRemaining,
          deadline: report.slaAckDeadline,
        });
      }
    }

    // Check response SLA (for non-RECEIVED statuses)
    if (report.status !== "RECEIVED" && report.slaResponseDeadline) {
      const daysRemaining = Math.ceil(
        (report.slaResponseDeadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      if (daysRemaining <= 0) {
        alerts.push({
          reportId: report.id,
          orgId: report.orgId,
          channel: report.channel,
          type: "response_overdue",
          daysRemaining,
          deadline: report.slaResponseDeadline,
        });
      } else if (daysRemaining <= 15) {
        alerts.push({
          reportId: report.id,
          orgId: report.orgId,
          channel: report.channel,
          type: "response_warning",
          daysRemaining,
          deadline: report.slaResponseDeadline,
        });
      }
    }
  }

  return alerts;
}

export function startSlaChecker() {
  // Run every hour
  cron.schedule("0 * * * *", async () => {
    try {
      const alerts = await checkSlaDeadlines();
      if (alerts.length > 0) {
        console.log(`[SLA] ${alerts.length} alert(s) found:`, alerts.map((a) => ({
          report: a.reportId.slice(0, 8),
          type: a.type,
          days: a.daysRemaining,
        })));
      }
    } catch (err) {
      console.error("[SLA] Check failed:", err);
    }
  });

  console.log("SLA checker scheduled (hourly)");
}

export { checkSlaDeadlines };
