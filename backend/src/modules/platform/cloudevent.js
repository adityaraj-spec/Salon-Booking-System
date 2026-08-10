/**
 * cloudevent.js — CloudEvents 1.0 Spec Serialization & Validation Helper (Phase 6 Enterprise Platform Core)
 */
import crypto from "crypto";

export const createCloudEvent = ({
  type,
  source = "salonnow.backend",
  subject = null,
  data = {},
  correlationId = null,
}) => {
  if (!type || typeof type !== "string") {
    throw new Error("[CloudEvent] Event type is required and must be a string");
  }

  return {
    specversion: "1.0",
    id: crypto.randomUUID(),
    source,
    type: `com.salonnow.${type}`,
    subject,
    datacontenttype: "application/json",
    time: new Date().toISOString(),
    correlationId: correlationId || crypto.randomUUID(),
    data,
  };
};

export const validateCloudEvent = (event) => {
  if (!event || typeof event !== "object") return false;
  const { specversion, id, source, type, time, data } = event;
  if (specversion !== "1.0") return false;
  if (!id || !source || !type || !time || !data) return false;
  return true;
};
