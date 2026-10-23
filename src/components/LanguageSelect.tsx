"use client";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Box, MenuItem, Select } from "@mui/material";
import { isLocale, languages } from "@/lib/i18n/languages";
import { useSetLocale } from "@/lib/i18n/Provider";

export default function LanguageSelect() {
  const { i18n } = useLingui();
  const setLocale = useSetLocale();
  return (
    <Select
      size="small"
      fullWidth
      variant="standard"
      disableUnderline
      value={i18n.locale}
      sx={{
        "& .MuiSelect-select": {
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          py: 1,
        },
      }}
      inputProps={{ "aria-label": i18n._(msg`Language`) }}
      onChange={(event) => {
        if (isLocale(event.target.value)) setLocale(event.target.value);
      }}
    >
      {languages.map(({ code, name, flag }) => (
        <MenuItem key={code} value={code} lang={code} sx={{ gap: 1.5 }}>
          <Box component="span" aria-hidden="true" sx={{ fontSize: "1.25rem" }}>
            {flag}
          </Box>
          <span>{name}</span>
        </MenuItem>
      ))}
    </Select>
  );
}
