import { Suspense } from 'react';
import IntegrationsContent from './IntegrationsContent';

export default function IntegrationsPage() {
  return (
    <Suspense>
      <IntegrationsContent />
    </Suspense>
  );
}
