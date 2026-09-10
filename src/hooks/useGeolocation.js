import { useCallback, useState } from 'react';

/**
 * One-shot browser geolocation, wrapped so a component gets `{ locating,
 * error, accuracy, locate, reset }` instead of the callback API.
 *
 * `locate(onPosition)` asks the browser for a fix and, on success, hands the
 * caller `{ latitude, longitude, accuracy }` — the caller decides what to do
 * with it (fill two form boxes, drop a pin). Errors are turned into a sentence
 * a person can act on rather than a numeric code.
 *
 * There is no watch mode on purpose: this exists to answer "where am I
 * standing" once, when someone taps a button, not to track them.
 */
export default function useGeolocation() {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);
  const [accuracy, setAccuracy] = useState(null);

  const reset = useCallback(() => {
    setError(null);
    setAccuracy(null);
  }, []);

  const locate = useCallback((onPosition) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('This browser will not share a location.');
      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc } = position.coords;
        setAccuracy(acc);
        setLocating(false);
        onPosition?.({ latitude, longitude, accuracy: acc });
      },
      (err) => {
        setLocating(false);
        setAccuracy(null);
        if (err.code === err.PERMISSION_DENIED) {
          setError(
            'Location permission was denied. Allow it for this site and try again, or type the coordinates in by hand.'
          );
        } else if (err.code === err.TIMEOUT) {
          setError('Timed out waiting for a fix. Try again outdoors, or enter the coordinates by hand.');
        } else {
          setError('This device could not work out where it is right now.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return { locating, error, accuracy, locate, reset };
}
