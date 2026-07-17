import {Lock, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useLoginForm from '@/features/auth/hooks/forms/useLoginForm';
import BaseInput, { PasswordInput } from '@/components/layout/input/BaseInput';

export default function LoginForm() {

  const { username, setUsername, password, setPassword, loading, handleSubmit } = useLoginForm();

  return (
    <form className="space-y-4">
      <BaseInput
        label="Username"
        labelIcon={UserIcon}
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
          disabled={loading}
          autoComplete="username"
      />

      <PasswordInput
        label="Password"
        labelIcon={Lock}
        id="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        required
        disabled={loading}
        autoComplete="current-password"
      />

      <Button
        icon={undefined}
        type="submit"
        disabled={loading}
        className="w-full"
        onClick={handleSubmit}
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}