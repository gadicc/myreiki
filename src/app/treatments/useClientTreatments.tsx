import { usePracticeData } from "@/client-data/Provider";

export default function useClientTreatments(
  practiceId: string,
  { sort }: { sort?: ["date", "asc" | "desc"] } = {},
) {
  const { clients, treatments } = usePracticeData();
  const combined = treatments
    .filter((t) => t.practiceId === practiceId)
    .map((treatment) => ({
      ...treatment,
      client: clients.find((c) => c._id === treatment.clientId),
    }));
  if (sort)
    combined.sort(
      (a, b) =>
        (new Date(a.date as Date).getTime() -
          new Date(b.date as Date).getTime()) *
        (sort[1] === "desc" ? -1 : 1),
    );
  return combined;
}
