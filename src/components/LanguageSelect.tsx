"use client";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { MenuItem, Select } from "@mui/material";
import { isLocale, languages } from "@/lib/i18n/languages";
import { useSetLocale } from "@/lib/i18n/Provider";

export default function LanguageSelect() {
  const { i18n } = useLingui();
  const setLocale = useSetLocale();
  return (
    <Select
      size="small"
      fullWidth
      value={i18n.locale}
      inputProps={{ "aria-label": i18n._(msg`Language`) }}
      onChange={(event) => {
        if (isLocale(event.target.value)) setLocale(event.target.value);
      }}
    >
      {languages.map(({ code, name }) => (
        <MenuItem key={code} value={code} lang={code}>
          {name}
        </MenuItem>
      ))}
    </Select>
  );
}
