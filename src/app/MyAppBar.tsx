"use client";
import * as React from "react";
import { useGongoOne, useGongoUserId } from "gongo-client-react";
import { signIn, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import NextLink from 'next/link';

import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Toolbar,
  Typography,
  IconButton,
  SwipeableDrawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Menu,
} from "@mui/material";
import {
  AccountCircle, Info, LocalLibrary ,
  AdminPanelSettings,
  Forum,
  Home,
  Menu as MenuIcon,
} from "@mui/icons-material";

import pathnames from "./pathnames";

export default function MyAppBar() {
  const pathname = usePathname();
  const title = (pathname && pathnames[pathname]) || "MyReiki";

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId }),
  );
  const isAdmin = user && user.admin;

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

  const drawer = React.useMemo(
    () => (
      <Box
        role="presentation"
        onClick={toggleDrawer(false)}
        onKeyDown={toggleDrawer(false)}
      >
        <Typography variant="h6" sx={{ my: 2, ml: 4 }}>
          MyReiki
        </Typography>

        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton component={NextLink} href="/">
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText>Home</ListItemText>
            </ListItemButton>
          </ListItem>
        </List>

        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton component={NextLink} href="/about">
              <ListItemIcon>
                <Info />
              </ListItemIcon>
              <ListItemText>About</ListItemText>
            </ListItemButton>
          </ListItem>
        </List>

        {isAdmin ? (
          <List>
            <ListItem disablePadding>
              <ListItemButton component={NextLink} href="/admin">
                <ListItemIcon>
                  <AdminPanelSettings />
                </ListItemIcon>
                <ListItemText>Admin</ListItemText>
              </ListItemButton>
            </ListItem>
          </List>
        ) : undefined}
      </Box>
    ),
    [isAdmin, toggleDrawer],
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
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
                aria-label="account of current user"
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
                        : "avatar"
                    }
                    src={user?.image as string}
                    imgProps={{ referrerPolicy: "no-referrer" }}
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
                  My account
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    signOut();
                    handleUserClose();
                  }}
                >
                  Logout
                </MenuItem>
              </Menu>
            </div>
          ) : (
            <Button
              variant="text"
              sx={{ color: "white" }}
              onClick={() => signIn()}
            >
              LOGIN
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
    </>
  );
}
