import MuiLink from "@mui/material/Link";
import NextLink from "next/link";
import React from "react";

export default function Link({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <MuiLink component={NextLink} href={href}>
      {children}
    </MuiLink>
  );
}
