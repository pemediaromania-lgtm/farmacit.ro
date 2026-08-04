"use client";

export function DeleteFeedButton({
  feedName,
  productCount,
  action,
}: {
  feedName: string;
  productCount: number;
  action: () => Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !confirm(
            `Ștergi definitiv feed-ul "${feedName}" și cele ${productCount} produse ale lui? Nu se poate anula.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-red-200 text-red-600 font-medium px-4 py-2 text-sm hover:bg-red-50 transition-colors whitespace-nowrap"
      >
        Șterge feed
      </button>
    </form>
  );
}
