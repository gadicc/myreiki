import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Autocomplete, TextField } from "@mui/material";
import { useSearchParams } from "next/navigation";
import React from "react";
import { usePracticeData } from "@/client-data/Provider";

export default function useClientId({
  initialClientId,
}: {
  initialClientId?: string;
}) {
  const searchParams = useSearchParams();
  const [clientId, setClientId] = React.useState(
    initialClientId || searchParams?.get("clientId") || "",
  );

  React.useEffect(() => {
    if (initialClientId && clientId === "") setClientId(initialClientId);
  }, [initialClientId, clientId]);

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
  const { i18n } = useLingui();

  const { clients: allClients } = usePracticeData();
  const clients = allClients.filter((c) => c.practiceId === practiceId);
  React.useEffect(() => {
    if (clientId && !clients.some((c) => c._id === clientId)) setClientId("");
  }, [clientId, clients, setClientId]);

  return (
    <Autocomplete
      options={clients}
      getOptionKey={(c) => c._id}
      getOptionLabel={(c) => `${c.givenName} ${c.familyName || ""}`.trim()}
      value={clients.find((c) => c._id === clientId) ?? null}
      onChange={(event, newInput) => setClientId(newInput?._id || "")}
      clearText={i18n._(msg`Clear`)}
      closeText={i18n._(msg`Close`)}
      openText={i18n._(msg`Open`)}
      noOptionsText={i18n._(msg`No matching clients`)}
      disablePortal
      renderInput={(params) => (
        <TextField
          {...params}
          label={i18n._(msg`Client`)}
          required={required}
        />
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
