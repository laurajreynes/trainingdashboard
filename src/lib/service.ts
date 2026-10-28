import type { Initiative, Person, Visit } from "@/lib/types";

/**
 * The service department of a store lives on the same store page behind a Sales / Service toggle.
 * What belongs to service:
 *   people     whose location is "Service" (advisors, the service BDC)
 *   initiatives named "<Store> Service: ..." or "Service: ..."
 *   visits     whose focus (after any time) starts "<Store> service" or "Service"
 */
export const isServicePerson = (p: Pick<Person, "location">) => /^service$/i.test((p.location || "").trim());

export const isServiceInit = (i: Pick<Initiative, "name">) => /^([A-Za-z]+\s+)?service\b/i.test(i.name.trim());

const TIME = /^\s*(?:\d{1,2}(?::\d{2})?\s?(?:am|pm)|AM|PM|Late morning|Early afternoon|Midday|Morning|Afternoon)\s*[-–:,]?\s*/i;
export const isServiceVisit = (v: Pick<Visit, "focus">) => /^([A-Za-z]+\s+)?service\b/i.test((v.focus || "").replace(TIME, ""));
