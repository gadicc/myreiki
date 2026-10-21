import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import React from "react";
import { usePracticeData } from "@/client-data/Provider";

export default function usePracticeId() {
  const [practiceId, setPracticeId] = React.useState("");
  const injectedProps = React.useMemo(
    () => ({
      practiceId,
      setPracticeId,
    }),
    [practiceId, setPracticeId],
  );

  const PracticeSelectMemo = React.useMemo<
    (
      props: Omit<
        Parameters<typeof PracticeSelect>[0],
        "practiceId" | "setPracticeId"
      >,
    ) => React.JSX.Element
  >(
    () =>
      (props = {}) =>
        React.cloneElement(<PracticeSelect {...injectedProps} {...props} />),
    [injectedProps],
  );

  return { practiceId, setPracticeId, PracticeSelect: PracticeSelectMemo };
}

export function PracticeSelect({
  practiceId,
  setPracticeId,
  sx = {},
  show,
}: {
  practiceId: string;
  setPracticeId: React.Dispatch<React.SetStateAction<string>>;
  sx?: Parameters<typeof FormControl>[0]["sx"];
  show?: boolean;
}) {
  const { i18n } = useLingui();

  const { practices } = usePracticeData();

  React.useEffect(() => {
    if (!practices.some((p) => p._id === practiceId))
      setPracticeId(practices[0]?._id ?? "");
  }, [practiceId, practices, setPracticeId]);

  if (show === undefined) show = practices.length > 1;
  if (!show) return null;

  return (
    <FormControl fullWidth sx={{ my: 1, ...sx }}>
      <InputLabel id="practiceId-label">
        <Trans>Practice</Trans>
      </InputLabel>
      <Select
        labelId="practiceId-label"
        id="practiceId-select"
        value={practiceId}
        label={i18n._(msg`Practice`)}
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
