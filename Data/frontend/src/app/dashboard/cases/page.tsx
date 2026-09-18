import { CONFIG } from 'src/global-config';

import { CasesView } from 'src/sections/damage/cases-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Fälle - ${CONFIG.appName}` };

export default function Page() {
  return <CasesView />;
}
