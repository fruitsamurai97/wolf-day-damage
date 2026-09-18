import { CONFIG } from 'src/global-config';
import { DashboardLayout } from 'src/layouts/dashboard';

import { AuthGuard } from 'src/auth/guard';

import { LangProvider } from 'src/sections/damage/i18n';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  if (CONFIG.auth.skip) {
    return (
      <LangProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </LangProvider>
    );
  }

  return (
    <AuthGuard>
      <LangProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </LangProvider>
    </AuthGuard>
  );
}
