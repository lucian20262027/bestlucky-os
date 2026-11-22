'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { MockRoom } from '@/components/MockRoom';

function MockRoomRouteContent() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? decodeURIComponent(params.id) : '';
  return <MockRoom questionId={id} />;
}

export default function MockRoomDynamicPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[80vh] items-center justify-center text-sm text-[var(--ink-muted)]">
          Loading Mock Room...
        </div>
      }
    >
      <MockRoomRouteContent />
    </Suspense>
  );
}
