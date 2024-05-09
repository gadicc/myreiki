import React from "react";
import { sha256 } from "js-sha256";

import { Avatar } from "@mui/material";
import { Client } from "@/schemas/client";

// From https://mui.com/material-ui/react-avatar/
function stringToColor(string: string) {
  let hash = 0;
  let i;

  /* eslint-disable no-bitwise */
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  /* eslint-enable no-bitwise */

  return color;
}

function clientAvatarProps(
  client: Client | { givenName: string; familyName: string },
) {
  const givenName = client.givenName || " ";
  const familyName = client.familyName || " ";
  const initials = givenName[0] + familyName[0];
  const color = stringToColor(initials);
  return {
    sx: { backgroundColor: color },
    children: initials,
  };
}

export function ClientAvatar({
  client,
}: {
  client: Client | { givenName: string; familyName: string };
}) {
  const avatarProps: Parameters<typeof Avatar>[0]["sx"] =
    clientAvatarProps(client);
  const avatarSrc =
    ("email" in client &&
      client.email &&
      `https://www.gravatar.com/avatar/${sha256(client.email.trim().toLowerCase())}?d=wavatar`) ||
    undefined;

  return <Avatar src={avatarSrc} {...avatarProps} />;
}
