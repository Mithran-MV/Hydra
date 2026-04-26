"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { HydraFallback } from "./HydraFallback";

const HydraScene = dynamic(
  () => import("./HydraScene").then((m) => m.HydraScene),
  { ssr: false, loading: () => <HydraFallback /> }
);

export function DeferredHydraScene(props: {
  aliveCount?: number;
  scarCount?: number;
  interactive?: boolean;
  quality?: "low" | "high";
  priority?: "high" | "low";
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const idle =
      (window as any).requestIdleCallback ??
      ((cb: () => void) => setTimeout(cb, props.priority === "high" ? 80 : 400));
    const handle = idle(() => setArmed(true), { timeout: 1500 });
    return () => {
      const cancel =
        (window as any).cancelIdleCallback ?? clearTimeout;
      cancel(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!armed) return <HydraFallback />;
  return (
    <>
      <HydraFallback />
      <HydraScene {...props} />
    </>
  );
}
