import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyLink } from "@/components/auth/verify-link";

/** Where the link in the sign-in mail lands. The work is in `VerifyLink`. */
export default function VerifyPage() {
  return (
    <AuthShell>
      <div className="mt-6">
        <VerifyLink />
      </div>
    </AuthShell>
  );
}
