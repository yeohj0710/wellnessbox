'use client';

import { useEffect } from 'react';
import Router from 'next/router';
import { useLoading } from '@/components/common/loadingContext.client';

export default function RouteChangeLoading() {
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    const handleStart = () => showLoading();
    const handleStop = () => hideLoading();

    Router.events.on('routeChangeStart', handleStart);
    Router.events.on('routeChangeComplete', handleStop);
    Router.events.on('routeChangeError', handleStop);

    return () => {
      Router.events.off('routeChangeStart', handleStart);
      Router.events.off('routeChangeComplete', handleStop);
      Router.events.off('routeChangeError', handleStop);
    };
  }, [showLoading, hideLoading]);

  return null;
}
