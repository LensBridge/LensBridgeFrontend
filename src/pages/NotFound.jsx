import { Link } from 'react-router-dom';
import { Button } from '../components/ui';
import MinbarMark from '../components/brand/MinbarMark';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="opacity-25 mb-6">
        <MinbarMark size={48} />
      </div>
      <p className="cap mb-3">404</p>
      <h1 className="text-xl text-ink mb-2">Nothing lives at this address</h1>
      <p className="text-[13px] text-muted max-w-sm leading-relaxed mb-7">
        The console was rebuilt around a new set of routes. If you followed a bookmark from the old
        app, the section you want is probably in the sidebar under a new name.
      </p>
      <Link to="/">
        <Button variant="primary">Back to overview</Button>
      </Link>
    </div>
  );
}
