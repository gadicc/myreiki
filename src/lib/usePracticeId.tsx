import React from "react";
import { useGongoUserId, useGongoLive, useGongoSub } from "gongo-client-react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

export default function usePracticeId() {
  const [practiceId, setPracticeId] = React.useState("");

  const PracticeSelectMemo = React.useMemo(
    () => () =>
      React.cloneElement(
        <PracticeSelect
          practiceId={practiceId}
          setPracticeId={setPracticeId}
        />,
      ),
    [practiceId, setPracticeId],
  );

  return { practiceId, setPracticeId, PracticeSelect: PracticeSelectMemo };
}

export function PracticeSelect({
  practiceId,
  setPracticeId,
}: {
  practiceId: string;
  setPracticeId: React.Dispatch<React.SetStateAction<string>>;
}) {
  const userId = useGongoUserId();

  const practices = useGongoLive((db) =>
    db.collection("practices").find({ userId }),
  );
  useGongoSub("practicesForUser");

  React.useEffect(() => {
    if (!practiceId && practices.length) setPracticeId(practices[0]._id);
  }, [practiceId, practices, setPracticeId]);

  return (
    <FormControl fullWidth sx={{ my: 1 }}>
      <InputLabel id="practiceId-label">Practice</InputLabel>
      <Select
        labelId="practiceId-label"
        id="practiceId-select"
        value={practiceId}
        label="Practice"
        onChange={(e) => setPracticeId(e.target.value)}
      >
        {practices.map((practice) => (
          <MenuItem key={practice._id} value={practice._id}>
            {practice.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
