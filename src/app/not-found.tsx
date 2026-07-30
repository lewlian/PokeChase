import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <p className="font-display text-6xl font-bold text-pokeyellow">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold">Wild MissingNo. appeared!</h1>
      <p className="mt-2 max-w-md text-mut">
        That page doesn&apos;t exist. It may have fled, or the link is out of date.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-pokeblue px-6 py-2 font-semibold text-white hover:opacity-90"
      >
        Back to the dashboard
      </Link>
    </div>
  );
}
