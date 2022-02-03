import { useEffect, useRef } from 'react';

const useInterval = (callback: () => any, delay: number): void => {
  const savedCallback = useRef<() => any>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => {
        clearInterval(id);
      };
    }
  }, [callback, delay]);
};

export default useInterval;
