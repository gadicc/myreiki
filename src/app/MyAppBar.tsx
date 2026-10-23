"use client";
import { useLoomPwaInstall } from "@gadicc/loom/next/pwa";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";

import {
  AccountCircle,
  AdminPanelSettings,
  Dry,
  Groups,
  Home,
  Info,
  InstallMobile,
  Menu as MenuIcon,
  NightShelter,
  Public,
} from "@mui/icons-material";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  SwipeableDrawer,
  Toolbar,
  Typography,
} from "@mui/material";
import NextLink from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";
import { SITE_TITLE } from "@/api-lib/consts";
import { usePracticeData } from "@/client-data/Provider";
import LanguageSelect from "@/components/LanguageSelect";
import { displayError } from "@/lib/i18n/messages";
import pathnames from "./pathnames";

export default function MyAppBar() {
  const { i18n } = useLingui();

  const pathname = usePathname();
  const searchParams = useSearchParams();

  let title = SITE_TITLE;
  const pnt = pathname && pathnames[pathname];
  if (pnt)
    title =
      typeof pnt === "function"
        ? i18n._(pnt({ pathname, searchParams }))
        : i18n._(pnt);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [installDialogOpen, setInstallDialogOpen] = React.useState(false);
  const { canInstall, isInstalled, isIOS, promptInstall } = useLoomPwaInstall();

  const handleInstall = async () => {
    setMobileOpen(false);
    try {
      const outcome = await promptInstall();
      if (outcome === "unavailable") setInstallDialogOpen(true);
    } catch {
      setInstallDialogOpen(true);
    }
  };

  const { profile: user, signIn, signOut } = usePracticeData();
  const userId = user?._id;
  const isAdmin = user && user.admin;
  const isPractitioner = user && user.practitioner;

  const iOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  const handleUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserClose = () => {
    setAnchorEl(null);
  };

  const toggleDrawer = React.useCallback(
    (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      if (
        event &&
        event.type === "keydown" &&
        ((event as React.KeyboardEvent).key === "Tab" ||
          (event as React.KeyboardEvent).key === "Shift")
      ) {
        return;
      }

      setMobileOpen(open);
    },
    [],
  );

  const drawer = (
    <Box
      role="presentation"
      onClick={toggleDrawer(false)}
      sx={{ display: "flex", flexDirection: "column", minHeight: "100%" }}
    >
      <Typography variant="h6" sx={{ my: 2, ml: 4 }}>
        <div style={{ position: "relative", paddingLeft: 28 }}>
          <Trans>
            <img
              src="/favicons/android-chrome-192x192.png"
              style={{
                height: "1.8em",
                marginRight: "5px",
                position: "absolute",
                left: -20,
                top: -2,
              }}
            />
            MyReiki
          </Trans>
        </div>
      </Typography>

      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton component={NextLink} href="/">
            <ListItemIcon>
              <Home />
            </ListItemIcon>
            <ListItemText>
              <Trans>Home</Trans>
            </ListItemText>
          </ListItemButton>
        </ListItem>
      </List>

      {isPractitioner ? (
        <>
          <Divider />
          <List>
            <ListItem disablePadding>
              <ListItemButton component={NextLink} href="/treatments">
                <ListItemIcon>
                  <Dry />
                </ListItemIcon>
                <ListItemText>
                  <Trans>Treatments</Trans>
                </ListItemText>
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={NextLink} href="/clients">
                <ListItemIcon>
                  <Groups />
                </ListItemIcon>
                <ListItemText>
                  <Trans>Clients</Trans>
                </ListItemText>
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={NextLink} href="/practices">
                <ListItemIcon>
                  <NightShelter />
                </ListItemIcon>
                <ListItemText>
                  <Trans>Practices</Trans>
                </ListItemText>
              </ListItemButton>
            </ListItem>
          </List>
        </>
      ) : undefined}

      {isAdmin ? (
        <List>
          <ListItem disablePadding>
            <ListItemButton component={NextLink} href="/admin">
              <ListItemIcon>
                <AdminPanelSettings />
              </ListItemIcon>
              <ListItemText>
                <Trans>Admin</Trans>
              </ListItemText>
            </ListItemButton>
          </ListItem>
        </List>
      ) : undefined}
      <Box sx={{ mt: "auto", pt: 2 }}>
        <Divider />
        <List>
          {canInstall ? (
            <ListItem disablePadding>
              <ListItemButton onClick={handleInstall}>
                <ListItemIcon>
                  <InstallMobile />
                </ListItemIcon>
                <ListItemText>
                  <Trans>Install this app</Trans>
                </ListItemText>
              </ListItemButton>
            </ListItem>
          ) : null}
          <ListItem disablePadding>
            <ListItemButton component={NextLink} href="/about">
              <ListItemIcon>
                <Info />
              </ListItemIcon>
              <ListItemText>
                <Trans>About</Trans>
              </ListItemText>
            </ListItemButton>
          </ListItem>
          <ListItem onClick={(event) => event.stopPropagation()}>
            <ListItemIcon>
              <Public />
            </ListItemIcon>
            <LanguageSelect />
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label={i18n._(msg`menu`)}
            sx={{ mr: 2 }}
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {userId ? (
            <div>
              <IconButton
                size="large"
                aria-label={i18n._(msg`account of current user`)}
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleUserMenu}
                color="inherit"
              >
                {user?.image ? (
                  <Avatar
                    alt={
                      typeof user?.displayName === "string"
                        ? user.displayName
                        : i18n._(msg`Profile image`)
                    }
                    src={user?.image as string}
                    slotProps={{ img: { referrerPolicy: "no-referrer" } }}
                  />
                ) : (
                  <AccountCircle />
                )}
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                open={Boolean(anchorEl)}
                onClose={handleUserClose}
              >
                <MenuItem
                  onClick={handleUserClose}
                  component={NextLink}
                  href="/account"
                >
                  <Trans>My account</Trans>
                </MenuItem>
                <MenuItem
                  onClick={async () => {
                    await signOut();
                    handleUserClose();
                  }}
                >
                  <Trans>Logout</Trans>
                </MenuItem>
              </Menu>
            </div>
          ) : (
            <Button
              variant="text"
              sx={{ color: "white" }}
              onClick={() =>
                signIn().catch((error) => alert(displayError(i18n, error)))
              }
            >
              <Trans>LOGIN</Trans>
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Box component="nav">
        <SwipeableDrawer
          swipeAreaWidth={15}
          hysteresis={0.3}
          disableBackdropTransition={!iOS}
          disableDiscovery={iOS}
          open={mobileOpen}
          onClose={toggleDrawer(false)}
          onOpen={toggleDrawer(true)}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            // display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: 260,
            },
          }}
        >
          {drawer}
        </SwipeableDrawer>
      </Box>
      <Dialog
        open={installDialogOpen && !isInstalled}
        onClose={() => setInstallDialogOpen(false)}
        aria-labelledby="install-dialog-title"
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle id="install-dialog-title">
          <Trans>Install this app</Trans>
        </DialogTitle>
        <DialogContent dividers>
          <Typography component="p" sx={{ mb: 2 }}>
            {isIOS ? (
              <Trans>Tap Share, then Add to Home Screen, then Add.</Trans>
            ) : (
              <Trans>
                Open your browser menu and choose Install app or Add to Home
                Screen.
              </Trans>
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <Trans>
              After installing, open MyReiki from your home screen or apps.
            </Trans>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallDialogOpen(false)}>
            <Trans>Close</Trans>
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
