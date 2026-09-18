import { CONFIG } from 'src/global-config';

import { DamageDashboardView } from 'src/sections/damage/dashboard-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Überblick - ${CONFIG.appName}` };

export default function Page() {
  return <DamageDashboardView />;
}
