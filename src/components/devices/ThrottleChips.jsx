import { decodeThrottle } from '../../utils/throttle';

function ThrottleChips({ value }) {
  const flags = decodeThrottle(value);

  if (!value) {
    return <span className="text-sm text-gray-500 dark:text-gray-400">No throttle data</span>;
  }

  if (flags.length === 0) {
    return <span className="inline-flex rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-300">Clear</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {flags.map((flag) => (
        <span
          key={flag.bit}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            flag.current ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200'
          }`}
        >
          {flag.label}
        </span>
      ))}
    </div>
  );
}

export default ThrottleChips;
