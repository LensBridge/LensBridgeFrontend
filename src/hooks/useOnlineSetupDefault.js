import { useEffect, useRef, useState } from 'react';
import DeviceService from '../services/DeviceService';

/**
 * The "Online setup" box: starts on when the server makes online setup files
 * by default (it has a backend URL for boards), off otherwise or until that is
 * known. Once the admin changes it, their choice stays, even if the answer
 * arrives after.
 *
 * @returns {[boolean, (on: boolean) => void]}
 */
export default function useOnlineSetupDefault() {
  const [online, setOnlineState] = useState(false);
  const touched = useRef(false);

  useEffect(() => {
    let cancelled = false;
    DeviceService.getSetupDefaults()
      .then(({ onlineSetup }) => {
        if (!cancelled && !touched.current) setOnlineState(Boolean(onlineSetup));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const setOnline = (on) => {
    touched.current = true;
    setOnlineState(on);
  };
  return [online, setOnline];
}
