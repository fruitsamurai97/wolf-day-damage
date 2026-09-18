import { CONFIG } from 'src/global-config';

import { CaseDetailView } from 'src/sections/damage/case-detail-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Dossier - ${CONFIG.appName}` };

export default function Page() {
  return <CaseDetailView />;
}
