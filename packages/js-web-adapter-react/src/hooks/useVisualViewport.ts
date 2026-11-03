import { useState, useEffect, useCallback } from "react";

export interface VisualViewportState {
  keyboardHeight: number;
  isKeyboardOpen: boolean;
  viewportHeight: number;
  viewportScale: number;
}

const KEYBOARD_THRESHOLD = 100;

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>({
    keyboardHeight: 0,
    isKeyboardOpen: false,
    viewportHeight: typeof window !== "undefined" ? window.innerHeight : 0,
    viewportScale: 1,
  });

  const update = useCallback(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const layoutHeight = window.innerHeight;
    const keyboardHeight = Math.max(0, Math.round(layoutHeight - vv.height - vv.offsetTop));

    setState({
      keyboardHeight,
      isKeyboardOpen: keyboardHeight > KEYBOARD_THRESHOLD,
      viewportHeight: Math.round(vv.height),
      viewportScale: vv.scale,
    });
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    update();

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [update]);

  return state;
}
