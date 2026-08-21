import type { DiaryCatalog, DiaryEntry, DiaryTrigger } from "./index";

export function resolveDiaryEntries(
  catalog: DiaryCatalog,
  trigger: DiaryTrigger,
): DiaryEntry[] {
  return catalog.entries.filter((entry) => {
    if (entry.unlock.kind !== trigger.kind) return false;
    if (trigger.kind === "date") return entry.unlock.value === trigger.date;
    if (trigger.kind === "campaign-end") return true;
    return (
      entry.unlock.missionId === trigger.missionId ||
      entry.unlock.value === trigger.missionId
    );
  });
}
