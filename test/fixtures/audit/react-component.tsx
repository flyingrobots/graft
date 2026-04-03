// Audit fixture: React component patterns
// Tests: arrow function components, hooks, props interfaces, JSX

import React, { useState, useEffect } from "react";

export interface UserProps {
  id: string;
  name: string;
  onSelect?: (id: string) => void;
}

export type UserState = {
  loading: boolean;
  error: string | null;
  data: Record<string, unknown> | null;
};

export const useCounter = (initial: number): [number, () => void, () => void] => {
  const [count, setCount] = useState(initial);
  return [count, () => setCount((c) => c + 1), () => setCount((c) => c - 1)];
};

export const useFetch = (url: string): UserState => {
  const [state, setState] = useState<UserState>({ loading: true, error: null, data: null });
  useEffect(() => {
    fetch(url)
      .then((r) => r.json())
      .then((data: unknown) => setState({ loading: false, error: null, data: data as Record<string, unknown> }))
      .catch((e: Error) => setState({ loading: false, error: e.message, data: null }));
  }, [url]);
  return state;
};

export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

export const formatDisplayName = (first: string, last: string): string => {
  return `${first} ${last}`.trim();
};

export default function UserCard({ id, name, onSelect }: UserProps): React.ReactElement {
  const [count, increment, decrement] = useCounter(0);
  const { loading, error, data } = useFetch(`/api/users/${id}`);
  const debouncedName = useDebounce(name, 300);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="user-card" onClick={() => onSelect?.(id)}>
      <h2>{debouncedName}</h2>
      <p>Views: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export const UserList = ({ users }: { users: UserProps[] }): React.ReactElement => {
  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}><UserCard {...u} /></li>
      ))}
    </ul>
  );
};
