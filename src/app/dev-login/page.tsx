import { Trans } from "@lingui/react/macro";
import { Button, Container, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { initRequestI18n } from "@/lib/i18n/server";
import {
  localIdentities,
  localTestLoginEnabled,
} from "@/server/localTestLogin";

// Evaluate the development guard per request and keep this route out of the
// production prerender manifest used for offline installation.
export const dynamic = "force-dynamic";

export default async function LocalTestLoginPage() {
  if (!localTestLoginEnabled) notFound();
  await initRequestI18n();
  return (
    <Container sx={{ my: 2 }}>
      <Typography variant="h5">
        <Trans>Local development fixture</Trans>
      </Typography>
      <Typography>
        <Trans>
          These fixed synthetic accounts exist only for local UI and offline
          testing.
        </Trans>
      </Typography>
      {Object.entries(localIdentities).map(([key, identity]) => (
        <form key={key} method="post" action="/api/dev-login">
          <input type="hidden" name="identity" value={key} />
          <input
            type="hidden"
            name="callbackURL"
            value={identity.defaultCallbackURL}
          />
          <Button type="submit">{identity.name}</Button>
        </form>
      ))}
    </Container>
  );
}
