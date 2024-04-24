import React from "react";
import { useGongoLive, useGongoSub } from "gongo-client-react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

export default function useClientId() {
  const [clientId, setClientId] = React.useState("");

  const ClientSelectMemo = React.useMemo(
    () =>
      ({ practiceId }: { practiceId: string }) =>
        React.cloneElement(
          <ClientSelect
            clientId={clientId}
            setClientId={setClientId}
            practiceId={practiceId}
          />,
        ),
    [clientId, setClientId],
  );

  return { clientId, setClientId, ClientSelect: ClientSelectMemo };
}

export function ClientSelect({
  clientId,
  setClientId,
  practiceId,
}: {
  clientId: string;
  setClientId: React.Dispatch<React.SetStateAction<string>>;
  practiceId: string;
}) {
  const clients = useGongoLive((db) =>
    db.collection("clients").find({ practiceId }),
  );
  useGongoSub("clientsForPractice", { _id: practiceId });

  return (
    <FormControl fullWidth sx={{ my: 1 }}>
      <InputLabel id="clientId-label">Client</InputLabel>
      <Select
        labelId="clientId-label"
        id="clientId-select"
        value={clientId}
        label="Client"
        onChange={(e) => setClientId(e.target.value)}
      >
        {clients.map((client) => (
          <MenuItem key={client._id} value={client._id}>
            {client.givenName} {client.familyName}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
