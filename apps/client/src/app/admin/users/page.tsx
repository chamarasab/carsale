'use client';

import { UserPlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { AppUser, createUser, getUsers, setUserActive } from '@/lib/admin-api';

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<Record<string, boolean>>({});
  const [savingUserId, setSavingUserId] = useState('');
  const [message, setMessage] = useState('');
  const isAdmin = session?.user.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin || !session?.accessToken) return;
    getUsers(session.accessToken)
      .then((loadedUsers) => {
        setUsers(loadedUsers);
        setDraftStatuses(Object.fromEntries(loadedUsers.map((user) => [user._id, user.active])));
      })
      .catch(() => setMessage('Could not load users.'));
  }, [isAdmin, session?.accessToken]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || !isAdmin) return;
    const form = new FormData(event.currentTarget);
    try {
      const user = await createUser(
        {
          name: String(form.get('name')),
          email: String(form.get('email')),
          password: String(form.get('password')),
        },
        session.accessToken,
      );
      setUsers((current) => [user, ...current]);
      setDraftStatuses((current) => ({ ...current, [user._id]: user.active }));
      event.currentTarget.reset();
      setMessage(`Created ${user.email}.`);
    } catch {
      setMessage('Could not create user. Check the email and password.');
    }
  }

  async function saveStatus(user: AppUser) {
    if (!session?.accessToken) return;
    setSavingUserId(user._id);
    setMessage('');
    try {
      const updated = await setUserActive(user._id, draftStatuses[user._id], session.accessToken);
      setUsers((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      setDraftStatuses((current) => ({ ...current, [updated._id]: updated.active }));
      setMessage(`Saved ${updated.email} as ${updated.active ? 'active' : 'inactive'}.`);
    } catch {
      setMessage(`Could not update ${user.email}.`);
    } finally {
      setSavingUserId('');
    }
  }

  return (
    <main className="min-h-screen">
      <Nav />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link className="text-sm font-black text-sub hover:text-signal" href="/admin">Back to admin panel</Link>
        <h1 className="mt-5 text-4xl font-black text-foreground">User management</h1>
        {!isAdmin ? (
          <div className="mt-6 rounded-panel border border-line bg-surface p-6">
            <p className="font-bold text-foreground">
              {status === 'loading' ? 'Checking access...' : 'Only the administrator can manage users.'}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
            <form className="h-fit rounded-panel border border-line bg-surface p-5 shadow-soft" onSubmit={onSubmit}>
              <UserPlus className="text-signal" />
              <h2 className="mt-3 text-xl font-black">Create user</h2>
              <Field label="Name" name="name" />
              <Field label="Email" name="email" type="email" />
              <Field label="Temporary password" minLength={8} name="password" type="password" />
              <button className="bg-brand-gradient mt-5 h-11 w-full rounded-panel font-black text-white" type="submit">
                Create publisher
              </button>
              {message ? <p className="mt-3 text-sm font-bold text-sub">{message}</p> : null}
            </form>
            <div className="rounded-panel border border-line bg-surface p-5 shadow-soft">
              <h2 className="text-xl font-black">Users</h2>
              <div className="mt-4 divide-y divide-line">
                {users.map((user) => (
                  <div className="grid gap-4 py-4 sm:grid-cols-[1fr_150px_auto] sm:items-center" key={user._id}>
                    <div>
                      <p className="font-black text-foreground">{user.name}</p>
                      <p className="text-sm text-muted">
                        {user.email} · {user.role}
                      </p>
                    </div>
                    <select
                      aria-label={`Account status for ${user.email}`}
                      className="h-10 rounded-panel border border-line bg-field px-3 text-sm font-bold text-foreground"
                      disabled={user.role === 'ADMIN'}
                      onChange={(event) =>
                        setDraftStatuses((current) => ({ ...current, [user._id]: event.target.value === 'active' }))
                      }
                      value={draftStatuses[user._id] === false ? 'inactive' : 'active'}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <button
                      className="h-10 rounded-panel bg-brand-gradient px-4 text-xs font-black text-white disabled:opacity-40"
                      disabled={
                        user.role === 'ADMIN' ||
                        savingUserId === user._id ||
                        draftStatuses[user._id] === user.active
                      }
                      onClick={() => saveStatus(user)}
                      type="button"
                    >
                      {savingUserId === user._id ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <label className="mt-4 grid gap-2 text-sm font-bold text-sub">
      {label}
      <input className="h-11 rounded-panel border border-line bg-field px-3 focus:border-signal focus:ring-signal/15" required {...inputProps} />
    </label>
  );
}
