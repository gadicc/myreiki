import React from "react";
import { db, useGongoLive, useGongoSub } from "gongo-client-react";
import { Autocomplete, TextField } from "@mui/material";

export default function useClientId() {
  const [clientId, setClientId] = React.useState("");

  const ClientSelectMemo = React.useMemo(
    () =>
      ({ practiceId, required }: { practiceId: string; required?: boolean }) =>
        React.cloneElement(
          <ClientSelect
            clientId={clientId}
            setClientId={setClientId}
            practiceId={practiceId}
            required={required}
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
  required,
}: {
  clientId: string;
  setClientId: React.Dispatch<React.SetStateAction<string>>;
  practiceId: string;
  required?: boolean;
}) {
  const clients = useGongoLive((db) =>
    db.collection("clients").find({ practiceId }),
  );
  useGongoSub("clientsForPractice", { _id: practiceId });

  return (
    <Autocomplete
      options={clients}
      getOptionKey={(c) => c._id}
      getOptionLabel={(c) => `${c.givenName} ${c.familyName}`}
      value={db.collection("clients").findOne(clientId)}
      onChange={(event, newInput) => setClientId(newInput?._id || "")}
      disablePortal
      renderInput={(params) => (
        <TextField {...params} label="Client" required={required} />
      )}
    />
    /*
    <FormControl fullWidth sx={{ my: 1 }} required={required}>
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
    */
  );
}
