import React from "react";
import { db, useGongoSub, useGongoLive } from "gongo-client-react";

export default function useClientTreatments(practiceId: string) {
  useGongoSub(practiceId && "clientsForPractice", { _id: practiceId });
  useGongoSub(practiceId && "treatmentsForPractice", { _id: practiceId });

  const _clients = useGongoLive((db) =>
    db.collection("clients").find({ practiceId }),
  );
  const _treatments = useGongoLive((db) =>
    db.collection("treatments").find({ practiceId }),
  );
  const combined = React.useMemo(
    () =>
      _treatments.map((treatment) => {
        const client =
          _clients &&
          db.collection("clients").findOne({ _id: treatment.clientId });
        return { ...treatment, client };
      }),
    [_treatments, _clients],
  );

  return combined;
}
