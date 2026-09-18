import { CONFIG } from 'src/global-config';

import { ModelLabView } from 'src/sections/damage/model-lab-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Model Lab - ${CONFIG.appName}` };

export default function Page() {
  return <ModelLabView />;
}
