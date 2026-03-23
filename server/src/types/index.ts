export enum ReportChannel {
  PDR125 = "pdr125",
  WHISTLEBLOWING = "whistleblowing",
}

export enum ReportStatus {
  RECEIVED = "received",
  ACKNOWLEDGED = "acknowledged",
  INVESTIGATING = "investigating",
  RESPONSE_GIVEN = "response_given",
  CLOSED_FOUNDED = "closed_founded",
  CLOSED_UNFOUNDED = "closed_unfounded",
  CLOSED_BAD_FAITH = "closed_bad_faith",
}

export enum Plan {
  STARTER = "starter",
  PROFESSIONAL = "professional",
  ENTERPRISE = "enterprise",
}

export enum PdrCategory {
  MOLESTIA_SESSUALE = "molestia_sessuale",
  DISCRIMINAZIONE_GENERE = "discriminazione_genere",
  MOBBING = "mobbing",
  LINGUAGGIO_OFFENSIVO = "linguaggio_offensivo",
  MICROAGGRESSIONE = "microaggressione",
  DISPARITA_RETRIBUTIVA = "disparita_retributiva",
  ALTRO = "altro",
}

export enum WbCategory {
  PENALE = "penale",
  AMMINISTRATIVO = "amministrativo",
  CONTABILE = "contabile",
  MOG231 = "mog231",
  DIRITTO_UE = "diritto_ue",
  CORRUZIONE = "corruzione",
  CONFLITTO_INTERESSI = "conflitto_interessi",
  DANNO_AMBIENTALE = "danno_ambientale",
  FRODE = "frode",
  ALTRO = "altro",
}

export interface JwtPayload {
  userId: string;
  orgId: string | null;
  role: "super_admin" | "admin" | "rpg" | "odv" | "technical";
}

export interface AnonJwtPayload {
  orgId: string;
  type: "anonymous";
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenantId?: string;
    }
  }
}
