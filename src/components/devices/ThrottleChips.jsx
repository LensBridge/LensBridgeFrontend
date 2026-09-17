import { decodeThrottle } from '../../utils/throttle';

function ThrottleChips({ value }) {
  const flags = decodeThrottle(value);

  if (!value) {
    return <span className="text-sm text-gray-500">No throttle data</span>;
  }

  if (flags.length === 0) {
    return <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">Clear</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {flags.map((flag) => (
        <span
          key={flag.bit}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            flag.current ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {flag.label}
        </span>
      ))}
    </div>
  );
}

export default ThrottleChips;
