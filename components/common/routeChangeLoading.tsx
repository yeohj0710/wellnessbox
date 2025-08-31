'use client';

import { useEffect, useRef } from 'react';
import Router from 'next/router';
import { useLoading } from '@/components/common/loadingContext.client';

export default function RouteChangeLoading() {
  const { showLoading, hideLoading } = useLoading();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleStart = (url: string) => {
      const currentPath = Router.asPath.split('?')[0].split('#')[0];
      const nextPath = url.split('?')[0].split('#')[0];
      if (currentPath !== nextPath) {
        showLoading();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          hideLoading();
          timeoutRef.current = null;
        }, 1000);
      }
    };
    const handleStop = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      hideLoading();
    };

    Router.events.on('routeChangeStart', handleStart);
    Router.events.on('routeChangeComplete', handleStop);
    Router.events.on('routeChangeError', handleStop);

    return () => {
      Router.events.off('routeChangeStart', handleStart);
      Router.events.off('routeChangeComplete', handleStop);
      Router.events.off('routeChangeError', handleStop);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [showLoading, hideLoading]);

  return null;
}
