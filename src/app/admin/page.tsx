"use client";
import {
  Alert,
  Button,
  Container,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";
import { usePracticeData } from "@/client-data/Provider";

export default function Admin() {
  const { profile } = usePracticeData();
  const [users, setUsers] = React.useState<
    { id: string; name: string; email: string; practitioner: boolean }[]
  >([]);
  const [next, setNext] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState("");
  const [error, setError] = React.useState("");
  const owner = React.useRef(profile?._id);
  owner.current = profile?._id;
  const load = React.useCallback(async (after?: string) => {
    const requestedOwner = owner.current;
    try {
      const response = await fetch(
        `/api/admin/users${after ? `?after=${encodeURIComponent(after)}` : ""}`,
        { cache: "no-store" },
      );
      if (!response.ok)
        throw new Error("Administrator access is required online.");
      const data = await response.json();
      if (owner.current !== requestedOwner) return;
      setUsers((previous) =>
        after ? [...previous, ...data.users] : data.users,
      );
      setNext(data.next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load users");
    }
  }, []);
  React.useEffect(() => {
    if (profile?.admin) void load();
  }, [profile?.admin, load]);
  if (!profile?.admin) return <Container>Access denied.</Container>;
  return (
    <Container sx={{ my: 2 }}>
      <Typography variant="h5">Users</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label="Find a loaded user"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users
            .filter((user) =>
              `${user.name} ${user.email}`
                .toLowerCase()
                .includes(filter.toLowerCase()),
            )
            .map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      {next && <Button onClick={() => void load(next)}>Load more</Button>}
    </Container>
  );
}
