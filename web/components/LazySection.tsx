"use client";

import { useEffect, useRef, useState } from "react";

export function LazySection({
  children,
  fallbackHeight = "80svh",
  rootMargin = "300px",
}: {
  children: React.ReactNode;
  fallbackHeight?: string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} style={show ? undefined : { minHeight: fallbackHeight }}>
      {show ? children : null}
    </div>
  );
}
