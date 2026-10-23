/**
 * Per-person CarWars setup progress for one store. Lives in a group note keyed cwsetup:<store slug>, one line per person:
 *   Name | agent line | steps done | out
 * Steps done is any of the letters L V C S (logged in, voice recognition, click to call, email signature).
 * A fourth field of "out" keeps that person off the counts (out sick, on leave) but still lists them.
 */
export const SETUP_STEPS = [
  { key: "L", label: "Logged in" },
  { key: "C", label: "Click to call" },
  { key: "V", label: "Voice recognition" },
  { key: "S", label: "Email signature" },
] as const;

/** Starting point per store until the note is saved from the hub; once saved, the group note wins. */
export const SETUP_SEED: Record<string, string> = {
  chevrolet: `# Name | agent line | done (L logged in, V voice recognition, C click to call, S email signature) | out
Annika Hilbrich | 406-536-8676 |
Daniela Zastavinetcaia | 406-536-8664 | L C
Eduardo Delgado | 406-536-8720 | L V C S
Eli Singleton | 406-536-8672 |
Evan Bangert | 406-536-8663 | L C S
Eve Johnson | 406-536-8668 |
Hattie Dursteler | 406-536-8674 |
Kaden Haffner | 406-536-8642 | L V C S
Lou Saucedo | 406-536-8721 | L V C
Owen Shields | 406-536-8656 | L V C S
Rob Burns | 406-536-8638 | L C
TJ Fields | 406-548-9609 |
Madelyn Nowak | | | out`,
  "chevrolet-belgrade": `# Name | agent line | done (L logged in, V voice recognition, C click to call, S email signature) | out
TC Antonsen | |
Casey St. Clair | | V
Alan Stradiotto | | V
Shane Briese | |
Erik McNeely | |`,
  "sales-bdc": `# Name | agent line | done (L logged in, V voice recognition, C click to call, S email signature) | out
Russ Stump | | V
Shane Deavours | | V
Justin Henzi | | V
Wyatt Kubiak | |
Angela Phanor | | | out
Maddi Hart | | | out`,
  subaru: `# Name | agent line | done (L logged in, V voice recognition, C click to call, S email signature) | out
Abie Benson | | V
Allison Bergen | | V
Catherine Long | | V
Dimitrios Imbrunetti | | V
Ethan Kilgore | | V
Ian Deroeck | | V
Mason Buck | | V
Mia Leandro | | V
Ryan Crum | | V
Ryan Ghormley | | V
Zachary Novak | | V
Halie Monroe | |
Chris Froelich | |`,
};

export type SetupPerson = { name: string; line: string; done: Set<string>; out: boolean };

export function parseSetup(body: string | null | undefined): SetupPerson[] {
  return (body || "").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => {
    const [name = "", line = "", steps = "", flag = ""] = l.split("|").map((x) => x.trim());
    return { name, line, done: new Set(steps.toUpperCase().replace(/[^LVCS]/g, "").split("")), out: /out/i.test(flag) };
  }).filter((p) => p.name);
}
