export function readDevicePixelRatio(target: Window): number {
  const ratio = target.devicePixelRatio;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}

export function watchDevicePixelRatio(target: Window, onChange: (ratio: number) => void): () => void {
  let ratio = readDevicePixelRatio(target);
  let media: MediaQueryList | undefined;
  let disposed = false;

  const armMediaQuery = () => {
    media?.removeEventListener('change', check);
    const query = target.matchMedia?.(`(resolution: ${ratio}dppx)`);
    media = typeof query?.addEventListener === 'function' && typeof query.removeEventListener === 'function'
      ? query
      : undefined;
    media?.addEventListener('change', check);
  };

  const check = () => {
    if (disposed) return;
    const nextRatio = readDevicePixelRatio(target);
    if (nextRatio === ratio) return;
    ratio = nextRatio;
    armMediaQuery();
    onChange(ratio);
  };

  const onVisibilityChange = () => {
    if (target.document.visibilityState !== 'hidden') check();
  };

  armMediaQuery();
  target.addEventListener('resize', check);
  target.addEventListener('focus', check);
  target.addEventListener('pageshow', check);
  target.document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    disposed = true;
    media?.removeEventListener('change', check);
    target.removeEventListener('resize', check);
    target.removeEventListener('focus', check);
    target.removeEventListener('pageshow', check);
    target.document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
